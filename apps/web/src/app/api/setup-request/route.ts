import { ownerKeyOk } from "@/lib/owner-auth";
import { allow, clientIp } from "@/lib/ratelimit";
import { getAgent, newId, recordRun, savePersist } from "@/lib/store";
import { sendWhatsApp } from "@/lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, n: number) => (typeof v === "string" ? v.trim().slice(0, n) : "");

/** A business owner asks the Weblyy team to set everything up for them. */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const agent = typeof body.id === "string" ? await getAgent(body.id) : null;
  if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
  if (!ownerKeyOk(agent, str(body.key, 64))) return Response.json({ error: "This link isn't valid." }, { status: 403 });
  if (!allow(`setup:${clientIp(req)}`, 5, 60_000)) return Response.json({ error: "Please wait a minute and try again." }, { status: 429 });

  const name = str(body.name, 60);
  const phone = str(body.phone, 20);
  if (!name) return Response.json({ error: "Please add your name." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10) return Response.json({ error: "Please add a 10-digit phone number so we can call you." }, { status: 400 });

  agent.setupRequest = {
    id: newId(),
    at: Date.now(),
    agentId: agent.id,
    business: agent.knowledge.name,
    name,
    phone,
    platform: str(body.platform, 40) || "Not sure",
    goal: str(body.goal, 60) || "Put the AI agent on my website",
    bestTime: str(body.bestTime, 40) || "Any time",
    note: str(body.note, 400),
    status: "new",
  };
  recordRun(agent, "Done-for-you setup requested", ["Owner asks", "Weblyy team calls", "Team installs everything", "Business live"], `${name} (${phone}) · ${agent.setupRequest.platform}`);
  savePersist();
  const team = process.env.TEAM_WHATSAPP;
  if (team) await sendWhatsApp(team, `New setup request: ${agent.knowledge.name}, ${name} ${phone}, ${agent.setupRequest.platform}, call ${agent.setupRequest.bestTime}.`).catch(() => false);
  return Response.json({ ok: true, request: agent.setupRequest });
}
