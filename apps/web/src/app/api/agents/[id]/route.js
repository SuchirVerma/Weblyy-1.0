import { ownerKeyOk } from "@/lib/owner-auth";
import { getAgent } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Public facts about an assistant (name, counts, suggested questions).
 * What customers wrote is private: the message log is only included for the owner's key.
 */
export async function GET(req, ctx) {
  const { id } = await ctx.params;
  const agent = await getAgent(id);
  if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
  const k = agent.knowledge;
  const owner = ownerKeyOk(agent, new URL(req.url).searchParams.get("key"));
  return Response.json({
    id: agent.id,
    name: k.name,
    businessType: k.businessType,
    workflowName: agent.workflowName,
    stats: { messages: agent.stats.messages, escalations: agent.stats.escalations, customers: agent.stats.customers.length },
    suggestions: [
      k.prices[0] ? `${k.prices[0].name} kitne ka hai?` : "Price kya hai?",
      "Saturday 4pm free hai?",
      "Kab tak khule ho?",
      "Where are you located?",
    ],
    log: (owner ? agent.log : [])
      .slice(-25)
      .map((l) => ({
        at: l.at,
        from: l.from.replace(/\d(?=\d{3})/g, "•"),
        text: l.text,
        reply: l.reply,
        intent: l.intent,
        escalate: l.escalate,
        source: l.source,
      })),
  });
}
