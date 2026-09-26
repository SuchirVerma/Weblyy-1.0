import "server-only";
import { aiReply } from "./ai";
import { rulesReply } from "./rules-agent";
import { historyFor, recordCustomerOnly, recordMessage, type DeployedAgent } from "./store";
import type { AgentReply } from "./types";

/**
 * One customer message in, one agent reply out. AI when available, rules otherwise. Never throws.
 * If the owner has taken over this customer's chat, the agent stays quiet and the message waits in the owner's inbox.
 */
export async function respond(agent: DeployedAgent, from: string, message: string): Promise<AgentReply & { ownerHandling?: boolean }> {
  if (agent.conversations[from]?.ownerHandling) {
    recordCustomerOnly(agent, from, message);
    return { reply: "", intent: "owner", escalate: false, source: "Owner is handling this chat", engine: "rules", ownerHandling: true };
  }
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
