import { aiAnswer, rulesAnswer } from "@/lib/concierge";
import { allow, clientIp } from "@/lib/ratelimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The guide on Weblyy's own pages. Answers questions about Weblyy, never about a specific business. */
export async function POST(req) {
  if (!(await allow(`concierge:${clientIp(req)}`, 30, 60_000))) return Response.json({ error: "Too many messages. Give it a minute." }, { status: 429 });
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const message = typeof body?.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!message) return Response.json({ error: "Type a message." }, { status: 400 });
  const history = Array.isArray(body?.history)
    ? body.history
        .filter((m) => m && typeof m.text === "string" && (m.role === "user" || m.role === "guide"))
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text.slice(0, 500) }))
    : [];

  try {
    const ai = await aiAnswer(history, message);
    if (ai) return Response.json(ai);
  } catch (e) {
    console.error("[concierge] AI failed, using rules:", e instanceof Error ? e.message : e);
  }
  return Response.json(rulesAnswer(message));
}
