import "server-only";
import { randomBytes } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ChatTurn, ScanResult, SiteKnowledge } from "./types";

export interface LogEntry {
  at: number;
  from: string;
  text: string;
  reply: string;
  intent: string;
  escalate: boolean;
  source: string;
}

export interface DeployedAgent {
  id: string;
  createdAt: number;
  workflowName: string;
  knowledge: SiteKnowledge;
  stats: { messages: number; escalations: number; customers: string[] };
  log: LogEntry[];
}

const DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");
const FILE = path.join(DIR, "agents.json");
const MAX_AGENTS = 50;

const g = globalThis as unknown as { __flowscoutAgents?: Map<string, DeployedAgent>; __flowscoutLoaded?: Promise<void> };
const agents: Map<string, DeployedAgent> = (g.__flowscoutAgents ??= new Map<string, DeployedAgent>());

async function load() {
  try {
    const list = JSON.parse(await readFile(FILE, "utf8")) as DeployedAgent[];
    for (const a of list) if (!agents.has(a.id)) agents.set(a.id, a);
  } catch {
    /* first run: nothing saved yet */
  }
}
const ready = () => (g.__flowscoutLoaded ??= load());

let saveTimer: NodeJS.Timeout | null = null;
function persist() {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      await mkdir(DIR, { recursive: true });
      await writeFile(FILE, JSON.stringify([...agents.values()]));
    } catch {
      /* read-only filesystem (e.g. serverless): keep running from memory */
    }
  }, 300);
}

/* Scans live in memory only; they are cheap to redo. */
const scanStore = ((globalThis as unknown as { __flowscoutScans?: Map<string, ScanResult> }).__flowscoutScans ??= new Map<string, ScanResult>());

export function saveScan(scan: ScanResult): string {
  const id = randomBytes(6).toString("hex");
  scanStore.set(id, scan);
  if (scanStore.size > 40) scanStore.delete(scanStore.keys().next().value!);
  return id;
}

export function getScan(id: string) {
  return scanStore.get(id) ?? null;
}

export async function createAgent(knowledge: SiteKnowledge, workflowName: string): Promise<DeployedAgent> {
  await ready();
  const id = randomBytes(5).toString("hex");
  const agent: DeployedAgent = { id, createdAt: Date.now(), workflowName, knowledge, stats: { messages: 0, escalations: 0, customers: [] }, log: [] };
  agents.set(id, agent);
  if (agents.size > MAX_AGENTS) {
    const oldest = [...agents.values()].sort((a, b) => a.createdAt - b.createdAt)[0];
    agents.delete(oldest.id);
  }
  persist();
  return agent;
}

export async function getAgent(id: string) {
  await ready();
  return agents.get(id) ?? null;
}

export async function latestAgent() {
  await ready();
  return [...agents.values()].sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
}

export function recordMessage(agent: DeployedAgent, entry: LogEntry) {
  agent.stats.messages += 1;
  if (entry.escalate) agent.stats.escalations += 1;
  if (!agent.stats.customers.includes(entry.from)) agent.stats.customers.push(entry.from);
  agent.log.push(entry);
  if (agent.log.length > 60) agent.log.splice(0, agent.log.length - 60);
  persist();
}

export function historyFor(agent: DeployedAgent, from: string): ChatTurn[] {
  return agent.log
    .filter((l) => l.from === from)
    .slice(-5)
    .flatMap((l) => [
      { role: "customer" as const, text: l.text },
      { role: "agent" as const, text: l.reply },
    ]);
}
