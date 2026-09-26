import "server-only";
import { aiReply } from "./ai";
import { rulesReply } from "./rules-agent";
import { historyFor, recordMessage, type DeployedAgent } from "./store";
import type { AgentReply } from "./types";

/** One customer message in, one agent reply out. AI when available, rules otherwise. Never throws. */
export async function respond(agent: DeployedAgent, from: string, message: string): Promise<AgentReply> {
  let reply: AgentReply | null = null;
  try {
    reply = await aiReply(agent.knowledge, historyFor(agent, from), message);
  } catch (e) {
    console.error("[agent] AI failed, using rules:", e instanceof Error ? e.message : e);
  }
  reply ??= rulesReply(agent.knowledge, message);
  recordMessage(agent, { at: Date.now(), from, text: message, ...reply });
  return reply;
}
