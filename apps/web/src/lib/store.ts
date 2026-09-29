import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Audit } from "./audit";
import { background, getJSON, getMany, redis, setJSON, useRedis } from "./kv";
import type { SearchPack } from "./aisearch";
import type { MakeoverPlan, SiteAudit, SiteBrand } from "./makeover";
import type { Answers, Capture, ChatTurn, ScanResult, SiteKnowledge } from "./types";

export interface LogEntry {
  at: number;
  from: string;
  text: string;
  reply: string;
  intent: string;
  escalate: boolean;
  source: string;
}

export interface ChatMessage {
  id: string;
  at: number;
  role: "customer" | "agent" | "owner";
  text: string;
  intent?: string;
  escalate?: boolean;
  delivered?: "chat" | "whatsapp" | "whatsapp-failed";
}

export interface LeadContext {
  name?: string;
  phone?: string;
  email?: string;
  interests: string[];
  intents: string[];
  when?: string;
  askedContact?: boolean;
  leadId?: string;
}

export interface Conversation {
  from: string;
  lead?: LeadContext;
  messages: ChatMessage[];
  /** An escalated message the owner hasn't answered yet */
  needsOwner: boolean;
  /** The owner is handling this customer; the agent stays quiet until handed back */
  ownerHandling: boolean;
  lastAt: number;
}

export type LeadStatus = "new" | "qualified" | "booked" | "converted" | "lost";

export interface Lead {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  phone: string;
  email: string;
  interest: string;
  source: string;
  status: LeadStatus;
  /** 0-100 from the AI qualification */
  score: number;
  temperature: "hot" | "warm" | "cold";
  qualification: string[];
  from: string;
  followUp: string;
  followUpSent: boolean;
}

export interface AutomationRun {
  id: string;
  at: number;
  automation: string;
  steps: string[];
  detail: string;
}

export interface SetupRequest {
  id: string;
  at: number;
  agentId: string;
  business: string;
  name: string;
  phone: string;
  platform: string;
  goal: string;
  bestTime: string;
  note: string;
  status: "new" | "contacted" | "done";
}

export interface Workspace {
  createdAt: number;
  sourceUrl: string;
  answers: Answers;
  auditBefore: Audit;
  auditAfter: Audit;
  search: SearchPack;
  makeover?: StoredMakeover;
}

/** The website analysis, plan and screenshots, kept with the workspace so the dashboard can show before and after. */
export interface StoredMakeover {
  brand: SiteBrand;
  before: SiteAudit;
  after: SiteAudit;
  plan: MakeoverPlan;
  shots: { before: Capture["shots"]; after: Capture["shots"] };
}

export interface DeployedAgent {
  id: string;
  ownerKey: string;
  createdAt: number;
  workflowName: string;
  knowledge: SiteKnowledge;
  stats: { messages: number; escalations: number; customers: string[] };
  log: LogEntry[];
  conversations: Record<string, Conversation>;
  leads: Lead[];
  runs: AutomationRun[];
  automations: Record<string, boolean>;
  workspace?: Workspace;
  setupRequest?: SetupRequest;
}

const DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "agents.json");
const MAX_AGENTS = 300;

const g = globalThis as unknown as { __weblyyAgents?: Map<string, DeployedAgent>; __weblyyLoaded?: Promise<void> };
const agents: Map<string, DeployedAgent> = (g.__weblyyAgents ??= new Map<string, DeployedAgent>());

function normalize(a: DeployedAgent) {
  a.conversations ??= {};
  a.leads ??= [];
  a.runs ??= [];
  a.automations ??= {};
  a.ownerKey ??= randomBytes(12).toString("hex");
  return a;
}

async function load() {
  if (useRedis) return; // each business is read from Redis when it's needed
  try {
    const list = JSON.parse(await readFile(FILE, "utf8")) as DeployedAgent[];
    for (const a of list) if (!agents.has(a.id)) agents.set(a.id, normalize(a));
  } catch {
    /* first run: nothing saved yet */
  }
}
const ready = () => (g.__weblyyLoaded ??= load());

/* With Redis, each business is its own record. Writes cover only the businesses this request read or created,
   so one instance never overwrites another's newer data with a stale copy. */
const AGENT_KEY = (id: string) => `agent:${id}`;
const AGENT_IDS = "agents";
/* What each business looked like when this instance last read or wrote it. A save writes every business
   that differs from that, so several changes in one request all land, and untouched copies are never re-sent. */
const saved = new Map<string, string>();
const touched = new Set<string>();
const queue = new Map<string, Promise<unknown>>();

let saveTimer: NodeJS.Timeout | null = null;
function persist() {
  if (useRedis) {
    const writes: Promise<unknown>[] = [];
    for (const id of touched) {
      const a = agents.get(id);
      if (!a) continue;
      const json = JSON.stringify(a);
      if (saved.get(id) === json) continue;
      saved.set(id, json);
      // Queued per business, so an older copy can never land after a newer one.
      const next = (queue.get(id) ?? Promise.resolve()).then(() => setJSON(AGENT_KEY(id), JSON.parse(json)));
      queue.set(id, next.catch(() => {}));
      writes.push(next);
    }
    if (writes.length) background(Promise.all(writes));
    return;
  }
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await mkdir(DIR, { recursive: true });
      await writeFile(FILE, JSON.stringify([...agents.values()]));
    } catch {
      /* read-only filesystem: keep running from memory */
    }
  }, 300);
}

async function allAgents(): Promise<DeployedAgent[]> {
  if (!redis) return [...agents.values()];
  const ids = await redis.smembers(AGENT_IDS);
  return (await getMany<DeployedAgent>(ids.map(AGENT_KEY))).map(normalize);
}

/* Scans are cheap to redo: in memory on a server, in Redis for a day on Vercel. */
const scanStore = ((globalThis as unknown as { __weblyyScans?: Map<string, ScanResult> }).__weblyyScans ??= new Map<string, ScanResult>());
const SCAN_TTL = 24 * 3600;

export async function saveScan(scan: ScanResult): Promise<string> {
  const id = randomBytes(6).toString("hex");
  scanStore.set(id, scan);
  if (scanStore.size > 40) scanStore.delete(scanStore.keys().next().value!);
  // The rendered HTML is large and only needed during the scan itself.
  if (useRedis) await setJSON(`scan:${id}`, { ...scan, capture: scan.capture && { ...scan.capture, html: "" } }, SCAN_TTL);
  return id;
}

export async function getScan(id: string): Promise<ScanResult | null> {
  if (!/^[a-f0-9]{12}$/.test(id)) return null;
  const hit = scanStore.get(id);
  if (hit || !useRedis) return hit ?? null;
  const scan = await getJSON<ScanResult>(`scan:${id}`);
  if (scan) scanStore.set(id, scan);
  return scan;
}

export async function createAgent(knowledge: SiteKnowledge, workflowName: string): Promise<DeployedAgent> {
  await ready();
  const id = randomBytes(5).toString("hex");
  const agent: DeployedAgent = {
    id,
    ownerKey: randomBytes(12).toString("hex"),
    createdAt: Date.now(),
    workflowName,
    knowledge,
    stats: { messages: 0, escalations: 0, customers: [] },
    log: [],
    conversations: {},
    leads: [],
    runs: [],
    automations: {},
  };
  agents.set(id, agent);
  if (redis) {
    touched.add(id);
    await redis.sadd(AGENT_IDS, id);
  } else if (agents.size > MAX_AGENTS) {
    // Drop the oldest unused one first, so a business that has customers or asked for setup is never lost to a pile of test scans.
    const used = (a: DeployedAgent) => a.leads.length > 0 || Object.keys(a.conversations).length > 0 || Boolean(a.setupRequest);
    const byAge = [...agents.values()].filter((a) => a.id !== id).sort((a, b) => a.createdAt - b.createdAt);
    const victim = byAge.find((a) => !used(a)) ?? byAge[0];
    if (victim) agents.delete(victim.id);
  }
  persist();
  return agent;
}

export async function getAgent(id: string) {
  await ready();
  if (useRedis) {
    // Always fresh: another instance may have changed it since.
    const a = /^[a-f0-9]{6,32}$/.test(id) ? await getJSON<DeployedAgent>(AGENT_KEY(id)) : null;
    if (!a) return null;
    agents.set(id, normalize(a));
    saved.set(id, JSON.stringify(a));
    touched.add(id);
  }
  return agents.get(id) ?? null;
}

export async function latestAgent() {
  await ready();
  const latest = (await allAgents()).sort((a, b) => b.createdAt - a.createdAt)[0];
  return latest ? getAgent(latest.id) : null;
}

const MAX_CONVERSATIONS = 200;
const MAX_MESSAGES = 80;
const msgId = () => randomBytes(6).toString("hex");

export function conversationFor(agent: DeployedAgent, from: string): Conversation {
  let c = agent.conversations[from];
  if (!c) {
    c = { from, messages: [], needsOwner: false, ownerHandling: false, lastAt: Date.now() };
    agent.conversations[from] = c;
    const keys = Object.keys(agent.conversations);
    if (keys.length > MAX_CONVERSATIONS) {
      const oldest = keys.sort((a, b) => agent.conversations[a].lastAt - agent.conversations[b].lastAt)[0];
      delete agent.conversations[oldest];
    }
  }
  return c;
}

function push(c: Conversation, m: Omit<ChatMessage, "id">) {
  const full = { ...m, id: msgId() };
  c.messages.push(full);
  if (c.messages.length > MAX_MESSAGES) c.messages.splice(0, c.messages.length - MAX_MESSAGES);
  c.lastAt = m.at;
  return full;
}

/** A customer message that the agent did not answer because the owner is handling the chat. */
export function recordCustomerOnly(agent: DeployedAgent, from: string, text: string) {
  const c = conversationFor(agent, from);
  push(c, { at: Date.now(), role: "customer", text });
  c.needsOwner = true;
  if (!agent.stats.customers.includes(from)) agent.stats.customers.push(from);
  persist();
}

export function recordOwnerReply(agent: DeployedAgent, to: string, text: string, delivered: ChatMessage["delivered"]) {
  const c = conversationFor(agent, to);
  const m = push(c, { at: Date.now(), role: "owner", text, delivered });
  c.needsOwner = false;
  c.ownerHandling = true;
  persist();
  return m;
}

export function setOwnerHandling(agent: DeployedAgent, from: string, handling: boolean) {
  const c = conversationFor(agent, from);
  c.ownerHandling = handling;
  if (!handling) c.needsOwner = false;
  persist();
}

export function recordMessage(agent: DeployedAgent, entry: LogEntry) {
  const c = conversationFor(agent, entry.from);
  push(c, { at: entry.at, role: "customer", text: entry.text });
  if (entry.reply) push(c, { at: entry.at + 1, role: "agent", text: entry.reply, intent: entry.intent, escalate: entry.escalate });
  if (entry.escalate) c.needsOwner = true;
  agent.stats.messages += 1;
  if (entry.escalate) agent.stats.escalations += 1;
  if (!agent.stats.customers.includes(entry.from)) agent.stats.customers.push(entry.from);
  agent.log.push(entry);
  if (agent.log.length > 60) agent.log.splice(0, agent.log.length - 60);
  persist();
}

export const newId = () => randomBytes(6).toString("hex");

export function savePersist() {
  persist();
}

export function recordRun(agent: DeployedAgent, automation: string, steps: string[], detail: string) {
  agent.runs.push({ id: newId(), at: Date.now(), automation, steps, detail });
  if (agent.runs.length > 200) agent.runs.splice(0, agent.runs.length - 200);
  persist();
}

export function historyFor(agent: DeployedAgent, from: string): ChatTurn[] {
  const c = agent.conversations[from];
  if (!c) return [];
  return c.messages.slice(-10).map((m) => ({ role: m.role === "customer" ? ("customer" as const) : ("agent" as const), text: m.text }));
}

/** Every done-for-you setup request across businesses, newest first (for the Weblyy team). */
export async function allSetupRequests() {
  await ready();
  return (await allAgents())
    .map((a) => a.setupRequest)
    .filter((r): r is SetupRequest => Boolean(r))
    .sort((a, b) => b.at - a.at);
}
