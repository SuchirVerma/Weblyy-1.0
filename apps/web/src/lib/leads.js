import "server-only";
import { AUTOMATIONS, isOn } from "./automations";
import { conversationFor, newId, recordRun, savePersist } from "./store";
import { sendWhatsApp } from "./twilio";
const PHONE = /(?:\+?91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/;
const EMAIL = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i;
const WHEN =
  /\b(?:today|tomorrow|aaj|kal|parso|monday|tuesday|wednesday|thursday|friday|saturday|sunday|this week|next week|weekend)\b(?:[^.?!\d]{0,12}\d{1,2}(?::\d{2})?\s?(?:am|pm|baje))?|\b\d{1,2}(?::\d{2})?\s?(?:am|pm|baje)\b/i;
const NAME_PATTERNS = [
  /\b(?:my name is|name is|i am|i'm|this is|it's|mera naam|naam|main)\s+([a-z][a-z]+(?:\s(?!hu\b|hoon\b|hai\b)[a-z][a-z]+)?)/i,
  /^([a-z][a-z]+(?:\s[a-z][a-z]+)?)\s*[,-]?\s*(?:\+?91)?[\s-]?[6-9]\d{4}/i,
];
const NOT_NAMES = new Set(
  "interested looking fine good okay ok yes no sure booking book price available free here there coming going ready thanks thank hello hi hey sir madam maam ji bhai the a an from kal aaj main mera naam my name is number phone call".split(
    " ",
  ),
);
const HINGLISH = /\b(kya|hai|kitna|kitne|kab|kaha|mujhe|chahiye|aap|kar|karna|milega|hoga|kal|aaj|ji|haan|nahi|batao)\b/i;
const cap = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());
export function extractContact(text) {
  const out = {};
  const p = text.match(PHONE)?.[0];
  if (p) {
    const d = p.replace(/\D/g, "").slice(-10);
    out.phone = `+91 ${d.slice(0, 5)} ${d.slice(5)}`;
  }
  const e = text.match(EMAIL)?.[0];
  if (e) out.email = e.toLowerCase();
  for (const re of NAME_PATTERNS) {
    const m = text.match(re)?.[1];
    if (m && !m.split(/\s+/).some((w) => NOT_NAMES.has(w.toLowerCase()))) {
      out.name = cap(m.toLowerCase());
      break;
    }
  }
  return out;
}
function interestFrom(message, prices, intent) {
  const q = message.toLowerCase();
  const GENERIC = /^(treatment|service|services|package|session|women|men|full|half|basic|premium|regular|makeup|facial|hair)$/;
  let best = null;
  for (const p of prices) {
    const words = p.name
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .split(/[\s+&/-]+/)
      .filter((w) => w.length > 2);
    const hits = words.filter((w) => q.includes(w.replace(/s$/, "")));
    const score = hits.length * 2 + hits.filter((w) => w.length >= 5 && !GENERIC.test(w)).length;
    if (hits.length && (hits.length >= Math.min(2, words.length) || score >= 3) && (!best || score > best.score)) best = { p, score };
  }
  const hit = best?.p;
  if (hit) return hit.name;
  if (intent === "booking") return "Appointment booking";
  if (intent === "price") return "Pricing";
  if (intent === "service_info") return "Services";
  return null;
}
function qualify(ctx) {
  let score = 20;
  const why = [];
  if (ctx.intents.includes("booking")) {
    score += 30;
    why.push("Asked to book");
  }
  if (ctx.intents.some((i) => i === "price" || i === "service_info")) {
    score += 12;
    why.push("Asked about prices or services");
  }
  const specific = ctx.interests.filter((i) => !/^(Pricing|Services|Appointment booking)$/.test(i));
  if (specific.length) {
    score += 13;
    why.push(`Interested in ${specific.slice(0, 2).join(", ")}`);
  }
  if (ctx.when) {
    score += 15;
    why.push(`Mentioned a time: “${ctx.when}”`);
  }
  if (ctx.phone) {
    score += 12;
    why.push("Shared a phone number");
  }
  if (ctx.email) score += 4;
  if (ctx.name) score += 4;
  score = Math.min(100, score);
  const temperature = score >= 70 ? "hot" : score >= 45 ? "warm" : "cold";
  return { score, temperature, why };
}
function followUpFor(agent, lead, ctx) {
  const biz = agent.knowledge.name;
  const who = lead.name ? `Hi ${lead.name.split(" ")[0]}` : "Hi";
  const about = lead.interest && !/^(Pricing|Services)$/.test(lead.interest) ? ` about ${lead.interest}` : "";
  const ask = ctx.intents.includes("booking")
    ? ctx.when
      ? `Shall we confirm your slot for ${ctx.when}?`
      : "Which day and time suits you? We'll lock it in."
    : "Would you like to book a slot this week?";
  return `${who}, this is ${biz}. Thanks for reaching out${about}! ${ask}`;
}
function upsertLead(agent, from, ctx, source) {
  const { score, temperature, why } = qualify(ctx);
  const interest = ctx.interests.filter((i) => !/^(Pricing|Services)$/.test(i))[0] ?? ctx.interests[0] ?? "General enquiry";
  const last10 = (n) => (n ?? "").replace(/\D/g, "").slice(-10);
  const existing =
    (ctx.leadId ? agent.leads.find((l) => l.id === ctx.leadId) : undefined) ??
    (ctx.phone ? agent.leads.find((l) => l.phone && last10(l.phone) === last10(ctx.phone)) : undefined);
  if (existing) ctx.leadId = existing.id;
  const now = Date.now();
  if (existing) {
    existing.name = ctx.name ?? existing.name;
    existing.phone = ctx.phone ?? existing.phone;
    existing.email = ctx.email ?? existing.email;
    existing.interest = interest;
    existing.score = score;
    existing.temperature = temperature;
    existing.qualification = why;
    if (existing.status === "new" && score >= 60) existing.status = "qualified";
    existing.updatedAt = now;
    if (!existing.followUpSent) existing.followUp = followUpFor(agent, existing, ctx);
    return { lead: existing, created: false };
  }
  const lead = {
    id: newId(),
    createdAt: now,
    updatedAt: now,
    name: ctx.name ?? "",
    phone: ctx.phone ?? "",
    email: ctx.email ?? "",
    interest,
    source,
    status: score >= 60 ? "qualified" : "new",
    score,
    temperature,
    qualification: why,
    from,
    followUp: "",
    followUpSent: false,
  };
  lead.followUp = followUpFor(agent, lead, ctx);
  agent.leads.unshift(lead);
  if (agent.leads.length > 500) agent.leads.pop();
  ctx.leadId = lead.id;
  return { lead, created: true };
}
async function onNewLead(agent, lead, via) {
  const capture = AUTOMATIONS.find((a) => a.key === via);
  recordRun(agent, capture.name, capture.steps, `${lead.name || "A customer"} · ${lead.interest} · via ${lead.source}`);
  if (isOn(agent.automations, "qualify")) {
    const q = AUTOMATIONS.find((a) => a.key === "qualify");
    recordRun(
      agent,
      q.name,
      q.steps,
      `${lead.name || "A customer"} is ${lead.temperature === "hot" ? "very interested" : lead.temperature === "warm" ? "interested" : "just asking"} · reply ready to send`,
    );
    const owner = process.env.OWNER_WHATSAPP;
    if (owner && lead.temperature === "hot") {
      await sendWhatsApp(owner, `New hot lead for ${agent.knowledge.name}: ${lead.name || "Customer"} ${lead.phone}, interested in ${lead.interest}.`).catch(
        () => false,
      );
    }
  }
}
/**
 * Runs after the agent has drafted a reply. Tracks interest, captures contact details, creates or updates the lead,
 * and returns text to append to the reply (asking for contact details, or confirming them).
 */
export async function leadStep(agent, from, message, reply, source) {
  const c = conversationFor(agent, from);
  const ctx = (c.lead ??= { interests: [], intents: [] });
  const sensitive = ["complaint", "refund", "medical"].includes(reply.intent);
  if (reply.intent && reply.intent !== "other" && reply.intent !== "greeting") ctx.intents.push(reply.intent);
  const interest = interestFrom(message, agent.knowledge.prices, reply.intent);
  if (interest && !ctx.interests.includes(interest)) ctx.interests.push(interest);
  const when = message.match(WHEN)?.[0];
  if (when) ctx.when = when.trim();
  if (reply.intent === "booking" && isOn(agent.automations, "booking")) {
    const b = AUTOMATIONS.find((a) => a.key === "booking");
    recordRun(agent, b.name, b.steps, `${ctx.name ?? "Customer"} asked for ${interest ?? "an appointment"}${ctx.when ? ` · ${ctx.when}` : ""}`);
  }
  if (sensitive) {
    const e = AUTOMATIONS.find((a) => a.key === "escalate");
    recordRun(
      agent,
      e.name,
      e.steps,
      `${reply.intent === "medical" ? "Medical question" : reply.intent === "refund" ? "Refund request" : "Complaint"}: “${message.slice(0, 60)}”`,
    );
  }
  const contact = extractContact(message);
  const gotNew = Boolean(contact.phone && contact.phone !== ctx.phone) || Boolean(contact.email && contact.email !== ctx.email);
  if (contact.name) ctx.name = contact.name;
  if (contact.phone) ctx.phone = contact.phone;
  if (contact.email) ctx.email = contact.email;
  if (!isOn(agent.automations, "capture")) {
    savePersist();
    return { text: "", replace: false };
  }
  const hi = HINGLISH.test(message);
  if (ctx.phone || ctx.email) {
    const { lead, created } = upsertLead(agent, from, ctx, source);
    if (created) await onNewLead(agent, lead, "capture");
    savePersist();
    if (gotNew) {
      const first = lead.name ? ` ${lead.name.split(" ")[0]}` : "";
      // A message that is mostly contact details needs a confirmation, not an answer.
      const replace = reply.intent === "other" || reply.intent === "greeting";
      return {
        replace,
        text: hi
          ? `Shukriya${first}! Aapka number ${lead.phone || lead.email} note kar liya hai. Team jaldi aapse contact karegi.`
          : `Thanks${first}! I've noted ${lead.phone || lead.email}. The team will get in touch shortly.`,
      };
    }
    return { text: "", replace: false };
  }
  const interested = ["booking", "price", "service_info"].includes(reply.intent);
  if (interested && !sensitive && !ctx.askedContact) {
    ctx.askedContact = true;
    savePersist();
    if (reply.intent === "booking")
      return {
        replace: false,
        text: hi ? "Slot pakka karne ke liye apna naam aur phone number bhej dijiye." : "To lock it in, please share your name and phone number.",
      };
    return {
      replace: false,
      text: hi
        ? "Chahein toh apna naam aur number bhej dijiye, team aapko details ke saath call kar degi."
        : "If you'd like, share your name and number and the team will call you with details.",
    };
  }
  savePersist();
  return { text: "", replace: false };
}
/** A lead from the AI-ready website's enquiry form. */
export async function formLead(agent, input) {
  const from = `form-${newId()}`;
  const c = conversationFor(agent, from);
  const ctx = (c.lead ??= { interests: [], intents: [] });
  const contact = extractContact(`${input.phone} ${input.email}`);
  ctx.name = input.name ? cap(input.name.toLowerCase()).slice(0, 60) : undefined;
  ctx.phone = contact.phone ?? (input.phone || undefined);
  ctx.email = contact.email ?? (input.email || undefined);
  const interest = input.interest || interestFrom(input.message, agent.knowledge.prices, "") || "General enquiry";
  ctx.interests.push(interest);
  if (/book|appointment|slot/i.test(`${input.interest} ${input.message}`)) ctx.intents.push("booking");
  else ctx.intents.push("service_info");
  const when = input.message.match(WHEN)?.[0];
  if (when) ctx.when = when.trim();
  c.messages.push({
    id: newId(),
    at: Date.now(),
    role: "customer",
    text: `Website form: ${input.message || input.interest || "Enquiry"} (${input.name}, ${input.phone || input.email})`,
  });
  c.lastAt = Date.now();
  const { lead } = upsertLead(agent, from, ctx, "Website form");
  if (isOn(agent.automations, "form")) await onNewLead(agent, lead, "form");
  savePersist();
  return lead;
}
