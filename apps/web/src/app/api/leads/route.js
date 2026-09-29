import { formLead } from "@/lib/leads";
import { allow, clientIp } from "@/lib/ratelimit";
import { getAgent } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const str = (v, n) => (typeof v === "string" ? v.trim().slice(0, n) : "");
/** Enquiry form on the AI-ready website. */
export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const agent = typeof body.agentId === "string" ? await getAgent(body.agentId) : null;
  if (!agent) return Response.json({ error: "This form isn't connected anymore." }, { status: 404 });
  if (!allow(`lead:${clientIp(req)}`, 6, 60_000)) return Response.json({ error: "Please wait a minute before sending again." }, { status: 429 });
  if (str(body.website, 100)) return Response.json({ ok: true }); // honeypot
  const name = str(body.name, 60);
  const phone = str(body.phone, 20);
  const email = str(body.email, 100);
  if (!name) return Response.json({ error: "Please add your name." }, { status: 400 });
  if (phone.replace(/\D/g, "").length < 10 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Please add a 10-digit phone number or an email." }, { status: 400 });
  }
  const lead = await formLead(agent, { name, phone, email, interest: str(body.interest, 80), message: str(body.message, 500) });
  return Response.json({ ok: true, name: lead.name });
}
