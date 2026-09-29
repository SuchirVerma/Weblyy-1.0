import { timingSafeEqual } from "node:crypto";
import { allow, clientIp } from "@/lib/ratelimit";
import { getAgent, recordOwnerReply, setOwnerHandling } from "@/lib/store";
import { sendWhatsApp } from "@/lib/twilio";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function keyOk(agent, key) {
  if (!key) return false;
  const a = Buffer.from(agent.ownerKey);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
const label = (from) =>
  from === "presenter"
    ? "Demo phone"
    : from.startsWith("whatsapp:")
      ? `WhatsApp ${from.slice(9).replace(/(\d{2})\d+(\d{4})$/, "$1••••••$2")}`
      : from.startsWith("guest-")
        ? `Visitor ${from.slice(6, 10).toUpperCase()}`
        : "Web visitor";
/** The owner's inbox: every conversation, newest first. */
export async function GET(req, ctx) {
  const { id } = await ctx.params;
  const agent = await getAgent(id);
  if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
  if (!keyOk(agent, new URL(req.url).searchParams.get("key"))) return Response.json({ error: "This inbox link isn't valid." }, { status: 403 });
  const conversations = Object.values(agent.conversations)
    .sort((a, b) => Number(b.needsOwner) - Number(a.needsOwner) || b.lastAt - a.lastAt)
    .map((c) => ({
      from: c.from,
      label: label(c.from),
      needsOwner: c.needsOwner,
      ownerHandling: c.ownerHandling,
      lastAt: c.lastAt,
      messages: c.messages.slice(-50),
    }));
  return Response.json({
    name: agent.knowledge.name,
    whatsappReady: Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM),
    conversations,
  });
}
/** Owner actions: reply to a customer, take over a chat, or hand it back to the agent. */
export async function POST(req, ctx) {
  const { id } = await ctx.params;
  const agent = await getAgent(id);
  if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  if (!keyOk(agent, typeof body.key === "string" ? body.key : null)) return Response.json({ error: "This inbox link isn't valid." }, { status: 403 });
  const to = typeof body.to === "string" ? body.to.slice(0, 60) : "";
  if (!to || !agent.conversations[to]) return Response.json({ error: "That conversation doesn't exist." }, { status: 404 });
  if (!allow(`owner:${clientIp(req)}`, 40, 60_000)) return Response.json({ error: "Slow down a little." }, { status: 429 });
  if (body.action === "handback" || body.action === "takeover") {
    setOwnerHandling(agent, to, body.action === "takeover");
    return Response.json({ ok: true });
  }
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 1000) : "";
  if (!text) return Response.json({ error: "Type a reply first." }, { status: 400 });
  let delivered = "chat";
  if (to.startsWith("whatsapp:")) delivered = (await sendWhatsApp(to, text)) ? "whatsapp" : "whatsapp-failed";
  const message = recordOwnerReply(agent, to, text, delivered);
  return Response.json({ ok: true, message });
}
