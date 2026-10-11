import "server-only";
import { aiReply } from "./ai";
import { ownerWillContact, REFUND, rulesReply } from "./rules-agent";
import { extractContact, leadStep } from "./leads";
import { enqueueRefundRequest } from "./outbox";
import { conversationFor, historyFor, newId, recordCustomerOnly, recordMessage } from "./store";
import { claimRefresh, isStale, refreshAgentKnowledge } from "./site-library";
import { after } from "next/server";
/**
 * One customer message in, one agent reply out. AI when available, rules otherwise. Never throws.
 * If the owner has taken over this customer's chat, the agent stays quiet and the message waits in the owner's inbox.
 */
export async function respond(agent, from, message, source = "Chat link") {
  if (agent.conversations[from]?.ownerHandling) {
    recordCustomerOnly(agent, from, message);
    return { reply: "", intent: "owner", escalate: false, source: "Owner is handling this chat", engine: "rules", ownerHandling: true };
  }
  let reply = null;
  try {
    reply = await aiReply(agent.knowledge, historyFor(agent, from), message);
  } catch (e) {
    console.error("[agent] AI failed, using rules:", e instanceof Error ? e.message : e);
  }
  reply ??= rulesReply(agent.knowledge, message);
  // Money back is the owner's decision. Whoever wrote the reply, the customer hears the same safe line
  // and the request is logged for a person to follow up.
  const refund = reply.intent === "refund" || REFUND.test(message);
  if (refund) {
    reply = { ...reply, reply: ownerWillContact(message), intent: "refund", escalate: true, source: "Refund rule" };
    logRefund(agent, from, message);
  }
  try {
    const extra = await leadStep(agent, from, message, reply, source);
    if (extra.text)
      reply = { ...reply, escalate: extra.replace ? false : reply.escalate, reply: extra.replace ? extra.text : `${reply.reply}\n\n${extra.text}` };
  } catch (e) {
    console.error("[leads]", e instanceof Error ? e.message : e);
  }
  recordMessage(agent, { at: Date.now(), from, text: message, ...reply });
  keepFresh(agent);
  return reply;
}
/** One sheet row (and email) per customer per day, however many times they repeat the request. */
function logRefund(agent, from, message) {
  const c = conversationFor(agent, from);
  if (c.refundLoggedAt && Date.now() - c.refundLoggedAt < 24 * 60 * 60_000) return;
  c.refundLoggedAt = Date.now();
  const said = historyFor(agent, from)
    .filter((t) => t.role === "customer")
    .map((t) => t.text)
    .concat(message)
    .join("\n");
  const who = extractContact(said);
  const request = {
    id: newId(),
    at: Date.now(),
    agentId: agent.id,
    business: agent.knowledge.name,
    website: agent.knowledge.url,
    name: who.name || "Customer (name not given)",
    phone: who.phone || (/\d{10}/.test(from) ? from : "Not given"),
    goal: "REFUND request from a customer",
    platform: "-",
    bestTime: "As soon as possible",
    note: message.slice(0, 400),
    ownerEmail: agent.alertEmail || "",
  };
  const send = () => enqueueRefundRequest(request).catch((e) => console.error("[refund] could not queue", e instanceof Error ? e.message : e));
  try {
    after(send);
  } catch {
    send(); // not inside a request (scripts, tests)
  }
}
/** Once a day at most, re-read the business's website after replying, so the next answers use today's prices and hours. */
function keepFresh(agent) {
  if (!isStale(agent.knowledge)) return;
  try {
    after(async () => {
      if (await claimRefresh(agent)) await refreshAgentKnowledge(agent.id);
    });
  } catch {
    // Not inside a request (scripts, tests): skip.
  }
}
