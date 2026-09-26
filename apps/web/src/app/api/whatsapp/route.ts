import { allow } from "@/lib/ratelimit";
import { respond } from "@/lib/respond";
import { getAgent, latestAgent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const xml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const twiml = (text: string) =>
  new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${text ? `<Message>${xml(text)}</Message>` : ""}</Response>`, {
    headers: { "content-type": "text/xml" },
  });

/** Twilio WhatsApp sandbox webhook. Point the sandbox's "When a message comes in" URL here. */
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null);
  const body = String(form?.get("Body") ?? "").trim().slice(0, 500);
  const from = String(form?.get("From") ?? "whatsapp:unknown").slice(0, 60);
  const id = new URL(req.url).searchParams.get("agent");
  const agent = id ? await getAgent(id) : await latestAgent();
  if (!agent) return twiml("This assistant isn't set up yet.");
  if (!body) return twiml("");
  if (!allow(`wa:${from}`, 10, 60_000)) return twiml("");
  const reply = await respond(agent, from, body, "WhatsApp");
  return twiml(reply.reply);
}
