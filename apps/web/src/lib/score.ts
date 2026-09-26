import type { Analysis, Answers, BusinessType, Channel, ScanResult, SiteKnowledge, SubScores, Verdict, Workflow } from "./types";

export const DEFAULT_ANSWERS: Answers = {
  dailyMessages: 30,
  replier: "owner",
  reminders: "manual",
  afterHours: "sometimes",
  hourlyCost: 150,
};

const MINUTES_PER_REPLY = 2;

export const clamp01 = (n: number) => Math.min(1, Math.max(0, Number.isFinite(n) ? n : 0));

interface Template {
  key: string;
  name: string;
  channel: Channel;
  trigger: string;
  description: string;
  share: number;
  repetitiveness: number;
  risk: number;
  data: (k: SiteKnowledge) => number;
  agentSteps: string[];
  guardrails: string[];
  when?: (k: SiteKnowledge, types: BusinessType) => boolean;
}

const hasPrices = (k: SiteKnowledge) => (k.prices.length >= 5 ? 0.95 : k.prices.length > 0 ? 0.75 : 0.35);
const hasHours = (k: SiteKnowledge) => (k.hours.length && k.address ? 0.95 : k.hours.length || k.address ? 0.7 : 0.4);
const hasBooking = (k: SiteKnowledge) =>
  k.embeds.some((e) => /booking|appointments/i.test(e)) ? 0.95 : k.forms.some((f) => f.purpose === "booking") ? 0.8 : 0.55;

const noun: Record<BusinessType, { service: string; visit: string }> = {
  salon: { service: "service", visit: "appointment" },
  clinic: { service: "consultation", visit: "appointment" },
  restaurant: { service: "dish", visit: "table booking" },
  education: { service: "course", visit: "demo class" },
  fitness: { service: "membership", visit: "trial session" },
  retail: { service: "product", visit: "order" },
  services: { service: "service", visit: "appointment" },
};

const PRICE_ASK: Record<BusinessType, string> = {
  salon: "Hair spa kitne ka hai?",
  clinic: "Consultation fee kitni hai?",
  restaurant: "Thali kitne ki hai?",
  education: "Fees kitni hai is batch ki?",
  fitness: "Monthly membership kitne ki hai?",
  retail: "Is ka price kya hai? Stock mein hai?",
  services: "Rate kya hai?",
};

function templates(t: BusinessType, k: SiteKnowledge): Template[] {
  const n = noun[t];
  const priceAsk = k.prices[0] ? `${k.prices[0].name} kitne ka hai?` : PRICE_ASK[t];
  return [
    {
      key: "price",
      name: t === "education" ? "Fee & batch enquiries" : t === "restaurant" ? "Menu & price questions" : "Price enquiries",
      channel: "whatsapp",
      trigger: priceAsk,
      description: `The most common message. The answer is already on the website, but someone still types it out by hand every time.`,
      share: 0.34,
      repetitiveness: 0.95,
      risk: 0.05,
      data: hasPrices,
      agentSteps: ["Detect a price question (English or Hinglish)", "Look up the item in the published price list", "Reply with the price and one related suggestion", "Offer to book a slot"],
      guardrails: ["Only quote prices published on the website", "Never invent discounts or offers", "If the item isn't listed, hand over to the owner"],
    },
    {
      key: "booking",
      name: t === "restaurant" ? "Table reservations" : t === "retail" ? "Order requests" : `${n.visit[0].toUpperCase()}${n.visit.slice(1)} booking`,
      channel: "whatsapp",
      trigger: "Saturday 4pm free hai?",
      description: `Back-and-forth about dates and slots. Easy to automate, as long as the owner confirms the final slot.`,
      share: 0.24,
      repetitiveness: 0.85,
      risk: 0.15,
      data: hasBooking,
      agentSteps: ["Collect name, service and preferred time", "Check the opening hours", "Propose the booking and send it to the owner to confirm", "Send the customer a confirmation"],
      guardrails: ["Owner confirms every booking before it's final", "Never double-book: unsure means ask the owner"],
    },
    {
      key: "info",
      name: "Timings & location questions",
      channel: "whatsapp",
      trigger: "Kab tak khula hai? Where exactly are you?",
      description: `Opening hours, address, parking and directions. The answers never change, but people still ask every day.`,
      share: 0.12,
      repetitiveness: 1,
      risk: 0.02,
      data: hasHours,
      agentSteps: ["Detect a timing or location question", "Reply with hours, address and a Maps link"],
      guardrails: ["Use only the hours and address published on the site"],
    },
    {
      key: "reminders",
      name: `${n.visit[0].toUpperCase()}${n.visit.slice(1)} reminders`,
      channel: "whatsapp",
      trigger: `24 hours before every ${n.visit}`,
      description: `A reminder the day before cuts no-shows. Right now it depends on someone remembering to send it.`,
      share: 0.1,
      repetitiveness: 1,
      risk: 0.05,
      data: hasBooking,
      agentSteps: ["Read tomorrow's bookings", "Send each customer a reminder with the time and address", "Let them reply to confirm or reschedule"],
      guardrails: ["Only message customers who booked", "One reminder per booking, no spam"],
      when: (_k, type) => type !== "retail",
    },
    {
      key: "leads",
      name: "Form enquiry follow-up",
      channel: "form",
      trigger: "Someone fills the contact form",
      description: `Form submissions sit in an inbox. A reply within a minute turns far more of them into customers.`,
      share: 0.07,
      repetitiveness: 0.75,
      risk: 0.1,
      data: (k) => (k.forms.length ? 0.85 : 0.5),
      agentSteps: ["Receive the form submission", "Answer the question from the website's content", "Reply by WhatsApp or email within a minute", "Flag hot leads to the owner"],
      guardrails: ["Anything the site doesn't answer goes to the owner"],
      when: (k) => k.forms.length > 0 || k.emails.length > 0,
    },
    {
      key: "reviews",
      name: "Google review requests",
      channel: "whatsapp",
      trigger: `A few hours after each ${n.visit}`,
      description: `Happy customers rarely leave reviews unless asked. A friendly nudge brings more of them in.`,
      share: 0.05,
      repetitiveness: 0.9,
      risk: 0.25,
      data: (k) => (k.embeds.includes("Google Maps") ? 0.8 : 0.6),
      agentSteps: ["Wait until the visit is done", "Ask how it went", "If happy, share the review link. If not, alert the owner."],
      guardrails: ["Never ask an unhappy customer for a review", "Owner approves the message wording"],
    },
    {
      key: "complaints",
      name: "Complaints & refunds",
      channel: "whatsapp",
      trigger: `I'm not happy with my ${n.service}. I want a refund.`,
      description: `Needs a human. The agent's only job here is to spot it fast, stay calm and alert the owner at once.`,
      share: 0.05,
      repetitiveness: 0.3,
      risk: 0.9,
      data: () => 0.3,
      agentSteps: ["Detect frustration or a refund request", "Apologise without admitting fault or promising money", "Alert the owner's phone immediately"],
      guardrails: ["Never promise refunds, discounts or compensation", "Always escalate to a human"],
    },
  ];
}

export function verdictFor(score: number, risk: number): Verdict {
  if (risk >= 0.6) return "human";
  if (score >= 40) return "automate";
  return "assist";
}

const AUTOMATABLE: Record<Verdict, number> = { automate: 0.8, assist: 0.4, human: 0 };

export function finalizeWorkflow(w: Omit<Workflow, "score" | "verdict" | "hoursPerWeek">, dailyForThis: number): Workflow {
  const v = clamp01(w.volume);
  const r = clamp01(w.repetitiveness);
  const d = clamp01(w.dataAvailability);
  const risk = clamp01(w.risk);
  const score = Math.round(v * r * d * (1 - risk) * 100);
  const verdict = verdictFor(score, risk);
  const hoursPerWeek = Math.round(((dailyForThis * 7 * MINUTES_PER_REPLY * AUTOMATABLE[verdict]) / 60) * 10) / 10;
  return { ...w, volume: v, repetitiveness: r, dataAvailability: d, risk, score, verdict, hoursPerWeek };
}

export function volumeFactor(perDay: number) {
  return clamp01(0.3 + perDay / 14);
}

export function ruleWorkflows(scan: ScanResult, a: Answers): Workflow[] {
  const k = scan.knowledge;
  return templates(k.businessType, k)
    .filter((t) => !t.when || t.when(k, k.businessType))
    .map((t) => {
      const perDay = a.dailyMessages * t.share;
      const reminderBoost = t.key === "reminders" && a.reminders === "automated" ? 0.2 : 1;
      return finalizeWorkflow(
        {
          id: t.key,
          name: t.name,
          channel: t.channel,
          channels: k.whatsapp.length || t.channel !== "whatsapp" ? [t.channel] : ["whatsapp", "phone"],
          trigger: t.trigger,
          description: t.description,
          volume: volumeFactor(perDay) * reminderBoost,
          repetitiveness: t.repetitiveness,
          dataAvailability: t.data(k),
          risk: t.risk,
          reason: "",
          agentSteps: t.agentSteps,
          guardrails: t.guardrails,
        },
        perDay * reminderBoost,
      );
    })
    .map((w) => ({ ...w, reason: reasonFor(w) }))
    .sort((x, y) => y.score - x.score);
}

export function reasonFor(w: Workflow): string {
  if (w.verdict === "human") return "High risk. A person should handle this, and the agent only raises the alarm.";
  if (w.verdict === "assist") return "Worth automating partly. The agent drafts, a person approves.";
  if (w.dataAvailability >= 0.8) return "Frequent, repetitive, and the answers are already on the website.";
  return "Frequent and repetitive. Add a few details and the agent can take it over.";
}

export function subScores(scan: ScanResult, a: Answers, workflows: Workflow[]): SubScores {
  const k = scan.knowledge;
  const chat = k.embeds.some((e) => /chat|widget/i.test(e));
  const booking = k.embeds.some((e) => /booking|appointments/i.test(e));
  let responsiveness = 15;
  if (chat) responsiveness += 30;
  if (booking) responsiveness += 15;
  responsiveness += { staff: 15, owner: 6, nobody: 0 }[a.replier];
  responsiveness += { yes: 15, sometimes: 6, no: 0 }[a.afterHours];
  responsiveness += { automated: 10, manual: 4, none: 0 }[a.reminders];

  const channels = new Set(scan.touchpoints.map((t) => t.channel).filter((c) => c !== "web"));
  const coverage = Math.min(100, channels.size * 18 + (k.prices.length ? 10 : 0));
  const repetitiveLoad = Math.min(100, Math.round(a.dailyMessages * 1.6 + 10));
  const top = workflows.filter((w) => w.verdict !== "human").slice(0, 3);
  const potential = top.length ? Math.round(top.reduce((s, w) => s + w.score, 0) / top.length) : 0;
  return { responsiveness: Math.min(100, responsiveness), coverage, repetitiveLoad, potential: Math.min(100, potential + 15) };
}

export function readinessFrom(s: SubScores) {
  return Math.round(0.45 * s.responsiveness + 0.25 * s.coverage + 0.3 * (100 - s.repetitiveLoad));
}

export function findingsFor(scan: ScanResult, a: Answers, hours: number): string[] {
  const k = scan.knowledge;
  const out = [...scan.gaps];
  if (a.replier === "owner") out.push("The owner answers messages personally, between customers and after closing.");
  if (a.afterHours !== "yes") out.push("Messages after closing wait until the next morning.");
  if (a.reminders !== "automated") out.push("Reminders are manual or missing, so no-shows go unchecked.");
  if (k.prices.length) out.push(`${k.prices.length} prices are already on the site. That's ready-made knowledge for an agent.`);
  out.push(`About ${hours} hours a week go into replies that could be automatic.`);
  return out;
}

export function roastFor(scan: ScanResult, a: Answers): string[] {
  const k = scan.knowledge;
  const lines: string[] = [];
  if (k.prices.length && k.whatsapp.length)
    lines.push(`You put ${k.prices.length} prices on your website and then answer "kitne ka hai?" on WhatsApp by hand. Every. Single. Time.`);
  if (k.forms.length && !k.embeds.some((e) => /chat/i.test(e)))
    lines.push("Your contact form collects phone numbers and then… does nothing with them. Bold strategy.");
  if (a.afterHours !== "yes") lines.push("After 8pm your business goes into airplane mode. Your customers don't.");
  if (a.replier === "owner") lines.push("The owner is also the receptionist, the call centre and the reminder service. Unpaid.");
  if (!k.whatsapp.length) lines.push("No WhatsApp link in 2026? Customers had to find your number like it's a treasure hunt.");
  if (!k.hours.length) lines.push("Your opening hours are a mystery novel. Customers have to message to find the ending.");
  if (a.reminders === "none") lines.push("No reminders means every no-show is a surprise party nobody wanted.");
  return lines.slice(0, 4);
}

export function buildAnalysis(scan: ScanResult, a: Answers, workflows: Workflow[], extra?: { summary?: string; roast?: string[] }): Analysis {
  const sorted = [...workflows].sort((x, y) => y.score - x.score);
  const hoursPerWeek = Math.round(sorted.reduce((s, w) => s + w.hoursPerWeek, 0) * 10) / 10;
  const rupeesPerMonth = Math.round((hoursPerWeek * 4.3 * a.hourlyCost) / 100) * 100;
  const s = subScores(scan, a, sorted);
  const auto = sorted.filter((w) => w.verdict === "automate").length;
  return {
    readiness: readinessFrom(s),
    subScores: s,
    workflows: sorted,
    hoursPerWeek,
    rupeesPerMonth,
    summary:
      extra?.summary ||
      `${scan.knowledge.name} handles about ${a.dailyMessages} customer messages a day by hand. ${auto} of ${sorted.length} workflows can be automated safely, which frees up roughly ${hoursPerWeek} hours every week.`,
    roast: extra?.roast?.length ? extra.roast : roastFor(scan, a),
    findings: findingsFor(scan, a, hoursPerWeek),
    engine: extra ? "ai" : "rules",
  };
}
