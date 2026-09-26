import { AUTOMATIONS, isOn } from "@/lib/automations";
import { ownerKeyOk } from "@/lib/owner-auth";
import { getAgent, recordOwnerReply, recordRun, savePersist, type LeadStatus } from "@/lib/store";
import { sendWhatsApp } from "@/lib/twilio";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const twilioReady = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
const n8nReady = () => Boolean(process.env.N8N_URL && process.env.N8N_API_KEY);

/** Everything the AI Business Command Center shows. Owner key required. */
export async function GET(req: Request, ctx: RouteContext<"/api/workspace/[id]">) {
  const { id } = await ctx.params;
  const agent = await getAgent(id);
  if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
  if (!ownerKeyOk(agent, new URL(req.url).searchParams.get("key"))) return Response.json({ error: "This link isn't valid." }, { status: 403 });
  const k = agent.knowledge;

  const intents: Record<string, number> = {};
  for (const l of agent.log) intents[l.intent] = (intents[l.intent] ?? 0) + 1;
  const bySource: Record<string, number> = {};
  for (const l of agent.leads) bySource[l.source] = (bySource[l.source] ?? 0) + 1;
  const conversations = Object.keys(agent.conversations).length;
  const handled = agent.log.filter((l) => !l.escalate).length;

  return Response.json({
    id: agent.id,
    createdAt: agent.createdAt,
    business: {
      name: k.name,
      type: k.businessType,
      url: k.url,
      description: k.description,
      address: k.address,
      hours: k.hours,
      phones: k.phones,
      whatsapp: k.whatsapp,
      emails: k.emails,
      prices: k.prices,
      faqs: k.faqs,
      services: k.services,
      socialLinks: k.socialLinks,
      pages: k.pages.length,
      instagram: k.instagram ?? null,
    },
    workspace: agent.workspace ?? null,
    stats: {
      messages: agent.stats.messages,
      escalations: agent.stats.escalations,
      customers: agent.stats.customers.length,
      conversations,
      handledByAgent: handled,
      minutesSaved: handled * 2,
    },
    leads: agent.leads.slice(0, 200),
    runs: agent.runs.slice(-60).reverse(),
    automations: AUTOMATIONS.map((a) => ({
      ...a,
      on: isOn(agent.automations, a.key),
      ready: a.requires === "twilio" ? twilioReady() : a.requires === "n8n" ? true : true,
      runs: agent.runs.filter((r) => r.automation === a.name).length,
      lastRun: [...agent.runs].reverse().find((r) => r.automation === a.name)?.at ?? null,
    })),
    analytics: { intents, bySource },
    links: {
      sitePath: `/site/${agent.id}`,
      chatPath: `/chat/${agent.id}`,
      ownerPath: `/owner/${agent.id}?key=${agent.ownerKey}`,
      whatsappWebhookPath: `/api/whatsapp?agent=${agent.id}`,
    },
    integrations: { twilio: twilioReady(), n8n: n8nReady() },
  });
}

/** Owner actions from the Command Center. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/workspace/[id]">) {
  const { id } = await ctx.params;
  const agent = await getAgent(id);
  if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
  let body: { key?: unknown; action?: unknown; automation?: unknown; on?: unknown; leadId?: unknown; status?: unknown; text?: unknown; channel?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  if (!ownerKeyOk(agent, typeof body.key === "string" ? body.key : null)) return Response.json({ error: "This link isn't valid." }, { status: 403 });

  if (body.action === "automation") {
    const def = AUTOMATIONS.find((a) => a.key === body.automation);
    if (!def || !def.toggleable) return Response.json({ error: "That automation can't be changed." }, { status: 400 });
    agent.automations[def.key] = Boolean(body.on);
    savePersist();
    return Response.json({ ok: true });
  }

  const lead = typeof body.leadId === "string" ? agent.leads.find((l) => l.id === body.leadId) : undefined;
  if (!lead) return Response.json({ error: "Lead not found." }, { status: 404 });

  if (body.action === "status") {
    const statuses: LeadStatus[] = ["new", "qualified", "booked", "converted", "lost"];
    if (!statuses.includes(body.status as LeadStatus)) return Response.json({ error: "Unknown status." }, { status: 400 });
    lead.status = body.status as LeadStatus;
    lead.updatedAt = Date.now();
    if (lead.status === "booked") recordRun(agent, "Appointment requests", ["Appointment request", "AI Customer Agent", "Qualification", "Owner confirms in inbox"], `${lead.name || "Lead"} marked as booked`);
    savePersist();
    return Response.json({ ok: true, lead });
  }

  if (body.action === "followup" && body.channel === "external") {
    // Sent by the owner through WhatsApp or a call from their own phone; just record it.
    lead.followUpSent = true;
    lead.updatedAt = Date.now();
    recordRun(agent, "Qualify and follow up new leads", ["New lead", "AI qualification", "Save to Lead Center", "Notify business", "Follow-up sent"], `Follow-up sent to ${lead.name || "lead"} on WhatsApp`);
    savePersist();
    return Response.json({ ok: true, lead });
  }

  if (body.action === "followup") {
    const text = typeof body.text === "string" && body.text.trim() ? body.text.trim().slice(0, 1000) : lead.followUp;
    let delivered: "chat" | "whatsapp" | "whatsapp-failed" = "chat";
    if (lead.from.startsWith("whatsapp:")) delivered = (await sendWhatsApp(lead.from, text)) ? "whatsapp" : "whatsapp-failed";
    if (!agent.conversations[lead.from]) return Response.json({ error: "This lead has no chat to reply in. Call them instead." }, { status: 400 });
    recordOwnerReply(agent, lead.from, text, delivered);
    lead.followUpSent = true;
    lead.updatedAt = Date.now();
    recordRun(agent, "Qualify and follow up new leads", ["New lead", "AI qualification", "Save to Lead Center", "Notify business", "Follow-up sent"], `Follow-up sent to ${lead.name || "lead"}`);
    savePersist();
    return Response.json({ ok: true, lead, delivered });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}
