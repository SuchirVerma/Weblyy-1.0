import "server-only";
import { aiReply } from "./ai";
import { rulesReply } from "./rules-agent";
import { leadStep } from "./leads";
import { historyFor, recordCustomerOnly, recordMessage, type DeployedAgent } from "./store";
import type { AgentReply } from "./types";

/**
 * One customer message in, one agent reply out. AI when available, rules otherwise. Never throws.
 * If the owner has taken over this customer's chat, the agent stays quiet and the message waits in the owner's inbox.
 */
export async function respond(agent: DeployedAgent, from: string, message: string, source = "Chat link"): Promise<AgentReply & { ownerHandling?: boolean }> {
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
  try {
    const extra = await leadStep(agent, from, message, reply, source);
    if (extra.text) reply = { ...reply, escalate: extra.replace ? false : reply.escalate, reply: extra.replace ? extra.text : `${reply.reply}\n\n${extra.text}` };
  } catch (e) {
    console.error("[leads]", e instanceof Error ? e.message : e);
  }
  recordMessage(agent, { at: Date.now(), from, text: message, ...reply });
  return reply;
}
