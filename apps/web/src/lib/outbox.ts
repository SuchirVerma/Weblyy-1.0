import "server-only";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { getJSON, serverless, setJSON, useRedis } from "./kv";
import { appendRow, sheetConfigured } from "./sheet";
import { NotConfigured, sendSms, smsProvider } from "./sms";
import type { SetupRequest } from "./store";

/**
 * Delivers every free-setup-call request by SMS and to the Google Sheet.
 * The request is written to disk before anything is sent, then each channel is retried with backoff
 * until it succeeds, so a provider outage or a server restart never loses a request.
 */

export type Channel = "sms" | "sheet";
export interface Delivery {
  status: "pending" | "sent" | "failed" | "waiting-setup";
  attempts: number;
  nextAt: number;
  lastError: string;
  result: string;
  sentAt: number | null;
}
export interface OutboxItem {
  id: string;
  createdAt: number;
  request: SetupRequest & { website: string };
  sms: Delivery;
  sheet: Delivery;
}

const DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "outbox.json");
const RETRY_MINUTES = [1, 5, 15, 60, 180, 720]; // then every 12 hours
const g = globalThis as unknown as { __weblyyOutbox?: { items: OutboxItem[]; loaded: Promise<void> | null; timer: ReturnType<typeof setInterval> | null; running: boolean } };
const state = (g.__weblyyOutbox ??= { items: [], loaded: null, timer: null, running: false });

export const SMS_TO = () => process.env.SETUP_SMS_TO || "";

async function load() {
  if (useRedis) {
    // Another instance may have added requests, so read fresh every time.
    const list = await getJSON<OutboxItem[]>("outbox");
    if (Array.isArray(list)) state.items = list;
    return;
  }
  state.loaded ??= readFile(FILE, "utf8")
    .then((t) => {
      const list = JSON.parse(t);
      if (Array.isArray(list)) state.items = list;
    })
    .catch(() => {
      /* first run: no file yet */
    });
  await state.loaded;
}

let writing: Promise<void> = Promise.resolve();
/** Atomic write (temp file + rename), serialised so two saves never interleave. */
function save() {
  writing = writing.then(async () => {
    try {
      if (useRedis) return void (await setJSON("outbox", state.items.slice(-2000)));
      await mkdir(DIR, { recursive: true });
      const tmp = `${FILE}.${process.pid}.tmp`;
      await writeFile(tmp, JSON.stringify(state.items.slice(-2000)));
      await rename(tmp, FILE);
    } catch (e) {
      console.error("[outbox] could not save", e);
    }
  });
  return writing;
}

const fresh = (): Delivery => ({ status: "pending", attempts: 0, nextAt: 0, lastError: "", result: "", sentAt: null });

const ist = (t: number) => new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export function smsText(r: OutboxItem["request"]) {
  // Plain ASCII keeps it to cheap GSM segments.
  const lines = [
    "Weblyy: new free setup call",
    `Name: ${r.name}`,
    `Mobile: ${r.phone}`,
    `Needs: ${r.goal}`,
    `Business: ${r.business}`,
    `Call: ${r.bestTime}`,
  ];
  if (r.note) lines.push(`Note: ${r.note.slice(0, 120)}`);
  return lines
    .join("\n")
    .replace(/[\u2013\u2014\u2212]/g, "-")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u20B9/g, "Rs ")
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/ +\n/g, "\n")
    .trim();
}

export function sheetRow(item: OutboxItem): Record<string, string> {
  const r = item.request;
  return {
    "Request ID": item.id,
    "Date & time (IST)": ist(item.createdAt),
    Name: r.name,
    Mobile: r.phone,
    "Help needed": r.goal,
    Business: r.business,
    Website: r.website,
    "Website made with": r.platform,
    "Best time to call": r.bestTime,
    Note: r.note,
  };
}

const inflight = new Set<string>();

async function attempt(item: OutboxItem, ch: Channel) {
  const d = item[ch];
  const lock = `${item.id}:${ch}`;
  if (d.status === "sent" || inflight.has(lock)) return;
  inflight.add(lock);
  try {
    await send(item, ch, d);
  } finally {
    inflight.delete(lock);
  }
}

async function send(item: OutboxItem, ch: Channel, d: Delivery) {
  const configured = ch === "sms" ? Boolean(smsProvider()) : sheetConfigured();
  if (!configured) {
    // Nothing to try yet; picked up automatically once the keys are added and the server restarts.
    d.status = "waiting-setup";
    d.lastError = ch === "sms" ? "SMS provider not set up yet." : "Google Sheet not connected yet.";
    d.nextAt = Date.now() + 60_000;
    return;
  }
  d.attempts += 1;
  try {
    d.result = ch === "sms" ? await sendSms(SMS_TO(), smsText(item.request)) : await appendRow(sheetRow(item));
    d.status = "sent";
    d.sentAt = Date.now();
    d.lastError = "";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    d.lastError = msg.slice(0, 300);
    if (e instanceof NotConfigured) {
      d.status = "waiting-setup";
      d.nextAt = Date.now() + 60_000;
    } else {
      d.status = "failed";
      const wait = RETRY_MINUTES[Math.min(d.attempts - 1, RETRY_MINUTES.length - 1)];
      d.nextAt = Date.now() + wait * 60_000;
    }
    console.error(`[outbox] ${ch} for ${item.id} failed (attempt ${d.attempts}): ${msg}`);
  }
}

/** Tries everything that is due. Safe to call often; only one run happens at a time. */
export async function processOutbox(force = false) {
  await load();
  if (state.running) return;
  state.running = true;
  try {
    const now = Date.now();
    for (const item of state.items) {
      for (const ch of ["sms", "sheet"] as const) {
        const d = item[ch];
        if (d.status !== "sent" && (force || d.nextAt <= now)) await attempt(item, ch);
      }
    }
    await save();
  } finally {
    state.running = false;
  }
}

function startTimer() {
  // Serverless instances freeze between requests; retries run when the team page is opened instead.
  if (state.timer || serverless) return;
  state.timer = setInterval(() => {
    processOutbox().catch((e) => console.error("[outbox] run failed", e));
  }, 60_000);
  state.timer.unref?.();
}

/** Called once when the server starts: delivers anything left over from before a restart. */
export function startOutbox() {
  startTimer();
  processOutbox().catch((e) => console.error("[outbox] startup run failed", e));
}

/** Saves the request, then delivers it straight away. Returns the delivery state. */
export async function enqueueSetupRequest(request: OutboxItem["request"]) {
  await load();
  startTimer();
  const item: OutboxItem = { id: request.id, createdAt: request.at, request, sms: fresh(), sheet: fresh() };
  state.items.push(item);
  await save(); // on disk before we try to send anything
  await Promise.all([attempt(item, "sms"), attempt(item, "sheet")]);
  await save();
  return { sms: item.sms.status, sheet: item.sheet.status };
}

export async function outboxItems() {
  await load();
  startTimer();
  if (serverless) await processOutbox().catch((e) => console.error("[outbox] retry run failed", e));
  return [...state.items].sort((a, b) => b.createdAt - a.createdAt);
}

export function deliveryConfig() {
  return { smsTo: SMS_TO(), sms: smsProvider(), sheet: sheetConfigured() };
}
