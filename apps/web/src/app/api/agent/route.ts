import { allow, clientIp } from "@/lib/ratelimit";
import { respond } from "@/lib/respond";
import { getAgent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { agentId?: unknown; message?: unknown; from?: unknown; source?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const agent = typeof body.agentId === "string" ? await getAgent(body.agentId) : null;
  if (!agent) return Response.json({ error: "This agent isn't live anymore." }, { status: 404 });

  const message = typeof body.message === "string" ? body.message.trim().slice(0, 500) : "";
  if (!message) return Response.json({ error: "Type a message first." }, { status: 400 });

  const ip = clientIp(req);
  if (!allow(`agent:${ip}`, 15, 60_000) || !allow(`agent-total:${agent.id}`, 400, 60 * 60_000)) {
    return Response.json({ error: "Slow down a little, the agent is catching its breath." }, { status: 429 });
  }
  const from = typeof body.from === "string" && body.from ? body.from.slice(0, 60) : `web-${ip}`;
  const SOURCES = ["Website AI Agent", "Chat link", "QR code", "Command Center test"];
  const source = typeof body.source === "string" && SOURCES.includes(body.source) ? body.source : "Chat link";
  return Response.json(await respond(agent, from, message, source));
}
