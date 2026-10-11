import { after } from "next/server";
import { AUTOMATIONS, automationDef } from "@/lib/automations";
import { maybeProcessOutbox } from "@/lib/outbox";
import { ownerKeyOk } from "@/lib/owner-auth";
import { getAgent, recordOwnerReply, recordRun, savePersist } from "@/lib/store";
import { sendWhatsApp } from "@/lib/twilio";
import { workspaceView } from "@/lib/workspace-view";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/** Everything the AI Business Command Center shows. Owner key required. */
export async function GET(req, ctx) {
  const { id } = await ctx.params;
  // The dashboard checks in every few seconds; use that to retry any pending SMS / Google Sheet deliveries.
  after(maybeProcessOutbox);
  const agent = await getAgent(id);
  if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
  if (!ownerKeyOk(agent, new URL(req.url).searchParams.get("key"))) return Response.json({ error: "This link isn't valid." }, { status: 403 });
  return Response.json(workspaceView(agent), { headers: { "cache-control": "no-store" } });
}
/** Owner actions from the Command Center. */
export async function PATCH(req, ctx) {
  const { id } = await ctx.params;
  const agent = await getAgent(id);
  if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
  let body;
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
  if (body.action === "alertEmail") {
    // Where this business's refund alerts are emailed. Empty switches them off.
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase().slice(0, 120) : "";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return Response.json({ error: "That email doesn't look right." }, { status: 400 });
    agent.alertEmail = email;
    savePersist();
    return Response.json({ ok: true, alertEmail: email });
  }
  if (body.action === "publish") {
    // The new website is already served by Weblyy; publishing marks it as the business's live site.
    const prev = agent.published;
    agent.published = { at: Date.now(), version: (prev?.version ?? 0) + 1, firstAt: prev?.firstAt ?? Date.now() };
    recordRun(agent, "Your new website went live", ["New design", "AI agent", "Google data", "Hosting"], `Version ${agent.published.version} of ${agent.knowledge.name}'s website is live`);
    savePersist();
    return Response.json({ ok: true, published: agent.published });
  }
  const lead = typeof body.leadId === "string" ? agent.leads.find((l) => l.id === body.leadId) : undefined;
  if (!lead) return Response.json({ error: "Lead not found." }, { status: 404 });
  if (body.action === "status") {
    const statuses = ["new", "qualified", "booked", "converted", "lost"];
    if (!statuses.includes(body.status)) return Response.json({ error: "Unknown status." }, { status: 400 });
    lead.status = body.status;
    lead.updatedAt = Date.now();
    if (lead.status === "booked") recordRun(agent, automationDef("booking").name, automationDef("booking").steps, `${lead.name || "Lead"} marked as booked`);
    savePersist();
    return Response.json({ ok: true, lead });
  }
  if (body.action === "followup" && body.channel === "external") {
    // Sent by the owner through WhatsApp or a call from their own phone; just record it.
    lead.followUpSent = true;
    lead.updatedAt = Date.now();
    recordRun(agent, automationDef("qualify").name, automationDef("qualify").steps, `Follow-up sent to ${lead.name || "lead"} on WhatsApp`);
    savePersist();
    return Response.json({ ok: true, lead });
  }
  if (body.action === "followup") {
    const text = typeof body.text === "string" && body.text.trim() ? body.text.trim().slice(0, 1000) : lead.followUp;
    let delivered = "chat";
    if (lead.from.startsWith("whatsapp:")) delivered = (await sendWhatsApp(lead.from, text)) ? "whatsapp" : "whatsapp-failed";
    if (!agent.conversations[lead.from]) return Response.json({ error: "This lead has no chat to reply in. Call them instead." }, { status: 400 });
    recordOwnerReply(agent, lead.from, text, delivered);
    lead.followUpSent = true;
    lead.updatedAt = Date.now();
    recordRun(agent, automationDef("qualify").name, automationDef("qualify").steps, `Follow-up sent to ${lead.name || "lead"}`);
    savePersist();
    return Response.json({ ok: true, lead, delivered });
  }
  return Response.json({ error: "Unknown action." }, { status: 400 });
}
