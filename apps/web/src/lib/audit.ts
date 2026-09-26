import type { Answers, ScanResult } from "./types";

export type CategoryKey = "website" | "agent" | "leads" | "search" | "automation";
export type Level = "good" | "warn" | "bad";

export interface AuditCheck {
  label: string;
  ok: boolean | "partial";
  detail: string;
}

export interface AuditCategory {
  key: CategoryKey;
  label: string;
  score: number;
  level: Level;
  summary: string;
  checks: AuditCheck[];
  recommendations: string[];
}

export interface Audit {
  score: number;
  categories: AuditCategory[];
  problems: string[];
  opportunities: string[];
}

/** What FlowScout has switched on for this business (after "Make my business AI-ready"). */
export interface Upgrades {
  agent?: boolean;
  website?: boolean;
  search?: boolean;
  leadCenter?: boolean;
  automations?: boolean;
}

const WEIGHTS: Record<CategoryKey, number> = { website: 0.2, agent: 0.22, leads: 0.2, search: 0.2, automation: 0.18 };

function score(checks: AuditCheck[]) {
  if (!checks.length) return 0;
  const pts = checks.reduce((s, c) => s + (c.ok === true ? 1 : c.ok === "partial" ? 0.5 : 0), 0);
  return Math.round((pts / checks.length) * 100);
}
const level = (s: number): Level => (s >= 75 ? "good" : s >= 45 ? "warn" : "bad");

export function auditBusiness(scan: ScanResult, answers: Answers, up: Upgrades = {}): Audit {
  const k = scan.knowledge;
  const sig = k.signals;
  const hasChat = k.embeds.some((e) => /chat|widget/i.test(e));
  const hasBookingTool = k.embeds.some((e) => /booking|appointments/i.test(e));
  const hasBookingForm = k.forms.some((f) => f.purpose === "booking");
  const hasForm = k.forms.some((f) => f.purpose !== "newsletter");
  const contactCount = k.phones.length + k.whatsapp.length + k.emails.length;
  const knowledgeItems = k.prices.length + k.faqs.length + (k.hours.length ? 3 : 0) + (k.address ? 2 : 0);
  const websiteOnlyInstagram = Boolean(k.instagram && k.pages.every((p) => p.url.includes("instagram.com")));
  const localTypes = /LocalBusiness|Salon|Dentist|Clinic|Medical|Restaurant|Store|School|Organization|HealthClub|Physician|Cafe|Hotel|Business/i;
  const hasSchema = (sig?.jsonLdTypes ?? []).some((t) => localTypes.test(t));
  const hasFaqSchema = (sig?.jsonLdTypes ?? []).some((t) => /FAQPage/i.test(t));

  // ---------------------------------------------------------------- Website
  const website: AuditCheck[] = up.website
    ? [
        { label: "Secure (HTTPS)", ok: true, detail: "The AI-ready website is served securely." },
        { label: "Mobile-first layout", ok: true, detail: "Designed for phones first, where most customers are." },
        { label: "Clear headline and business description", ok: true, detail: "Visitors know what you do in one glance." },
        { label: "Contact details up front", ok: true, detail: "Call, WhatsApp and chat buttons on every screen." },
        { label: "Strong calls to action", ok: true, detail: "Book, Call and Chat buttons guide every visitor." },
        { label: "Services and prices easy to find", ok: k.prices.length > 0 || k.services.length > 0 ? true : "partial", detail: k.prices.length ? `${k.prices.length} prices laid out clearly.` : "Add prices to show them here." },
      ]
    : [
        { label: "Has a website", ok: !websiteOnlyInstagram, detail: websiteOnlyInstagram ? "Only an Instagram profile. Customers can't find you on the open web." : `${k.pages.length} pages read.` },
        { label: "Secure (HTTPS)", ok: sig ? sig.https : false, detail: sig?.https ? "Served over HTTPS." : "Not served over HTTPS. Browsers warn visitors." },
        { label: "Mobile-friendly", ok: sig ? sig.viewport : false, detail: sig?.viewport ? "Has a mobile viewport." : "No mobile viewport. Pages may look tiny on phones." },
        { label: "Clear headline", ok: sig?.h1 ? (sig.h1.length > 6 ? true : "partial") : false, detail: sig?.h1 ? `“${sig.h1.slice(0, 60)}”` : "No main headline (H1) on the homepage." },
        { label: "Contact details visible", ok: contactCount >= 2 ? true : contactCount === 1 ? "partial" : false, detail: `${contactCount} ways to contact found.` },
        { label: "Calls to action", ok: (sig?.ctaCount ?? 0) >= 3 ? true : (sig?.ctaCount ?? 0) > 0 ? "partial" : false, detail: `${sig?.ctaCount ?? 0} Book / Call / Chat buttons found.` },
        { label: "Services and prices listed", ok: k.prices.length >= 5 ? true : k.prices.length > 0 || k.services.length > 2 ? "partial" : false, detail: k.prices.length ? `${k.prices.length} prices published.` : "No prices on the site." },
      ];

  // ------------------------------------------------------ AI Customer Agent
  const agent: AuditCheck[] = [
    { label: "AI Customer Agent on the site", ok: up.agent ? true : hasChat ? "partial" : false, detail: up.agent ? "Live on the website, chat link and QR code." : hasChat ? "A basic chat widget exists, but it needs a human to answer." : "No agent. Every question waits for a person." },
    { label: "Answers after closing time", ok: up.agent || answers.afterHours === "yes" ? true : answers.afterHours === "sometimes" ? "partial" : false, detail: up.agent ? "Replies in seconds, 24/7." : "Late-evening messages wait until morning." },
    { label: "Knows your business", ok: knowledgeItems >= 12 ? true : knowledgeItems >= 4 ? "partial" : false, detail: `${k.prices.length} prices, ${k.faqs.length} FAQs${k.hours.length ? ", opening hours" : ""}${k.address ? ", address" : ""} available to answer from.` },
    { label: "Speaks the customer's language", ok: up.agent ? true : false, detail: up.agent ? "English and Hinglish." : "Not set up yet." },
    { label: "Hands tricky chats to the owner", ok: up.agent ? true : answers.replier === "staff" ? "partial" : false, detail: up.agent ? "Complaints and sensitive questions go to the owner inbox." : "No escalation path." },
  ];

  // ------------------------------------------------------------ Lead capture
  const leads: AuditCheck[] = [
    { label: "Enquiry or booking form", ok: up.website || hasBookingForm || hasBookingTool ? true : hasForm ? "partial" : false, detail: up.website ? "Lead form on the AI-ready website." : hasForm ? `${k.forms.length} form(s) found.` : "No way to leave details on the site." },
    { label: "WhatsApp click-to-chat", ok: k.whatsapp.length > 0 || up.website ? true : false, detail: k.whatsapp.length ? "WhatsApp link found." : "No WhatsApp link." },
    { label: "Agent collects contact details", ok: up.agent ? true : false, detail: up.agent ? "Asks for name and number when a customer shows interest." : "Interested visitors leave without a trace." },
    { label: "Leads are qualified", ok: up.leadCenter ? true : false, detail: up.leadCenter ? "Each lead gets an AI qualification score." : "No way to tell hot leads from browsers." },
    { label: "Leads tracked in one place", ok: up.leadCenter ? true : hasForm ? "partial" : false, detail: up.leadCenter ? "Lead Center with status for every lead." : "Enquiries scattered across WhatsApp, calls and email." },
  ];

  // ------------------------------------------------------ AI Search readiness
  const search: AuditCheck[] = [
    { label: "Structured business data", ok: up.search || hasSchema ? true : false, detail: up.search ? "LocalBusiness structured data generated." : hasSchema ? `Found: ${sig!.jsonLdTypes.join(", ")}` : "No structured data. AI assistants have to guess who you are." },
    { label: "Meta description", ok: up.search || (sig?.metaDescription?.length ?? 0) > 50 ? true : sig?.metaDescription ? "partial" : false, detail: up.search ? "Written for search and AI summaries." : sig?.metaDescription ? `“${sig.metaDescription.slice(0, 70)}…”` : "Missing." },
    { label: "Clear business description", ok: up.search || k.description.length > 60 ? true : k.description ? "partial" : false, detail: k.description ? `${k.description.length} characters.` : "No short description of what you do." },
    { label: "FAQ content", ok: up.search ? true : k.faqs.length >= 4 ? (hasFaqSchema ? true : "partial") : k.faqs.length ? "partial" : false, detail: up.search ? "FAQs with structured data." : `${k.faqs.length} FAQs${k.faqs.length && !hasFaqSchema ? ", not marked up" : ""}.` },
    { label: "Location", ok: k.address ? true : false, detail: k.address ? k.address.slice(0, 60) : "No address on the site." },
    { label: "Opening hours", ok: k.hours.length ? true : false, detail: k.hours[0] ?? "Not listed." },
    { label: "Services and prices", ok: k.prices.length >= 5 ? true : k.prices.length || k.services.length ? "partial" : false, detail: k.prices.length ? `${k.prices.length} priced services.` : "Services not clearly listed." },
    { label: "Contact details", ok: contactCount >= 2 ? true : contactCount ? "partial" : false, detail: `${contactCount} contact methods.` },
  ];

  // -------------------------------------------------------------- Automation
  const automation: AuditCheck[] = [
    { label: "Instant replies to common questions", ok: up.agent ? true : hasChat ? "partial" : false, detail: up.agent ? "Price, timing and location questions answered automatically." : "Every reply is typed by hand." },
    { label: "Booking requests handled", ok: up.automations || hasBookingTool ? true : hasBookingForm ? "partial" : false, detail: up.automations ? "Collected by the agent, confirmed by the owner in one tap." : hasBookingTool ? "Booking tool found." : "Bookings happen over calls and chats." },
    { label: "Lead follow-up", ok: up.automations ? true : false, detail: up.automations ? "Follow-up drafted for every new lead." : "No follow-up. Leads go cold." },
    { label: "Appointment reminders", ok: answers.reminders === "automated" ? true : answers.reminders === "manual" ? "partial" : false, detail: answers.reminders === "automated" ? "Already automatic." : answers.reminders === "manual" ? "Sent by hand." : "No reminders." },
    { label: "Owner alerts", ok: up.automations ? true : false, detail: up.automations ? "Owner inbox flags anything that needs a person." : "Urgent messages get lost in the pile." },
  ];

  const cats: AuditCategory[] = [
    mk("website", "Website", website, {
      good: "The website does its job.",
      warn: "The website works, but it isn't built to convert.",
      bad: "The website is holding the business back.",
    }),
    mk("agent", "AI Customer Agent", agent, {
      good: "Customers get instant, accurate answers.",
      warn: "Some answers are available, but nobody gives them instantly.",
      bad: "No AI agent. Every question waits for a person.",
    }),
    mk("leads", "Lead Capture", leads, {
      good: "Interested visitors become tracked leads.",
      warn: "Some enquiries are captured, most aren't tracked.",
      bad: "Interested visitors leave without a trace.",
    }),
    mk("search", "AI Search Readiness", search, {
      good: "AI assistants and search engines can understand this business.",
      warn: "Partly understandable to AI search. Key facts are missing or unstructured.",
      bad: "Hard for AI assistants and search to understand this business.",
    }),
    mk("automation", "Automation", automation, {
      good: "Routine work runs by itself.",
      warn: "A few things are automated. Most still depend on the owner.",
      bad: "Everything depends on someone remembering.",
    }),
  ];

  const total = Math.round(cats.reduce((s, c) => s + c.score * WEIGHTS[c.key], 0));
  // One problem per category first, then the rest, so the list covers every weak area.
  const failing = cats.map((c) => c.checks.filter((x) => x.ok === false).map((x) => `${c.label}: ${x.detail}`));
  const problems = [...failing.map((f) => f[0]).filter(Boolean), ...failing.flatMap((f) => f.slice(1))].slice(0, 6);
  const opportunities = cats
    .filter((c) => c.level !== "good")
    .flatMap((c) => c.recommendations.slice(0, 1))
    .slice(0, 5);
  return { score: total, categories: cats, problems, opportunities };
}

function mk(key: CategoryKey, label: string, checks: AuditCheck[], summaries: Record<Level, string>): AuditCategory {
  const s = score(checks);
  const lv = level(s);
  return { key, label, score: s, level: lv, summary: summaries[lv], checks, recommendations: recommend(key, checks) };
}

function recommend(key: CategoryKey, checks: AuditCheck[]): string[] {
  const missing = (label: string) => checks.find((c) => c.label === label && c.ok !== true);
  const out: string[] = [];
  switch (key) {
    case "website":
      if (missing("Has a website")) out.push("Launch a proper website so customers can find you beyond Instagram.");
      if (missing("Mobile-friendly") || missing("Calls to action") || missing("Clear headline"))
        out.push("Transform the website: a mobile-first layout with a clear headline and Book / Call / Chat buttons on every screen.");
      if (missing("Services and prices listed")) out.push("List your services with prices so customers stop asking “kitne ka hai?”.");
      if (missing("Secure (HTTPS)")) out.push("Serve the site over HTTPS so browsers don't warn visitors.");
      break;
    case "agent":
      if (missing("AI Customer Agent on the site")) out.push("Add an AI Customer Agent that answers from your own website, 24/7, in English and Hinglish.");
      if (missing("Knows your business")) out.push("Publish prices, timings and FAQs so the agent can answer more on its own.");
      break;
    case "leads":
      if (missing("Agent collects contact details")) out.push("Let the agent collect name and number from interested customers automatically.");
      if (missing("Leads tracked in one place")) out.push("Track every enquiry in one Lead Center with a status and an AI qualification.");
      if (missing("Enquiry or booking form")) out.push("Add a short enquiry form. Two fields are enough.");
      break;
    case "search":
      if (missing("Structured business data")) out.push("Add LocalBusiness structured data so AI assistants and search engines can read your name, services, hours and location.");
      if (missing("Meta description") || missing("Clear business description")) out.push("Write a clear one-paragraph business description and meta description.");
      if (missing("FAQ content")) out.push("Publish FAQs (with FAQ structured data) answering what customers ask most.");
      if (missing("Location") || missing("Opening hours")) out.push("Show your address and opening hours in plain text on the site.");
      break;
    case "automation":
      if (missing("Instant replies to common questions")) out.push("Automate replies to price, timing and location questions.");
      if (missing("Lead follow-up")) out.push("Draft a follow-up for every new lead so none go cold.");
      if (missing("Booking requests handled")) out.push("Let the agent collect booking details and send them to the owner for a one-tap confirm.");
      break;
  }
  return out;
}
