import "server-only";
import { aiChainEnabled, chainJSON } from "./ai-chain";
import { finalizeWorkflow, reasonFor, volumeFactor } from "./score";
import { profileOf } from "./profiles";
/**
 * The optional AI layer: refines the workflow analysis and writes assistant replies.
 * It uses the chain of free providers in ai-chain.js, where each one takes over when the one before it runs out
 * of quota or fails. Every function returns null when nothing could answer, and callers then use the rules engine.
 */
export const aiEnabled = () => aiChainEnabled();

const INTENTS = ["price", "booking", "hours", "location", "service_info", "complaint", "refund", "medical", "greeting", "other"];
const CHANNELS = ["whatsapp", "email", "phone", "form", "booking", "chat", "social", "web"];
const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const unit = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : null;
};
const list = (v, max, len) => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : []);

/** Free providers have small per-minute token limits, so they get a shorter copy of the business information. */
export async function aiJSON({ system, messages, shape, check, maxTokens, live }) {
  return chainJSON({
    system: system(true),
    messages,
    shape,
    check,
    maxTokens,
    budgetMs: live ? 12_000 : 45_000,
    perTryMs: live ? 7_000 : 30_000,
  });
}

function knowledgeBlock(k, compact = false) {
  const text = compact ? k.text.slice(0, 3500) : k.text;
  const pagesMax = compact ? 5000 : 40000;
  return [
    `Business: ${k.name}`,
    `Type: ${k.businessType}`,
    `Website: ${k.url}`,
    k.description && `About: ${k.description}`,
    k.address && `Address: ${k.address}`,
    k.hours.length && `Hours: ${k.hours.join(" | ")}`,
    k.phones.length && `Phone: ${k.phones.join(", ")}`,
    k.whatsapp.length && `WhatsApp: ${k.whatsapp.join(", ")}`,
    k.emails.length && `Email: ${k.emails.join(", ")}`,
    k.prices.length && `Prices:\n${k.prices.map((p) => `- ${p.name}: ${p.price}`).join("\n")}`,
    k.faqs.length && `FAQs:\n${k.faqs.map((f) => `Q: ${f.q}\nA: ${f.a}`).join("\n")}`,
    k.services?.length && `Services: ${k.services.join(", ")}`,
    k.content?.about?.length && `About:\n${k.content.about.join("\n")}`,
    k.content?.sections?.length && `Sections of the website:\n${k.content.sections.map((x) => `- ${x.heading}: ${x.text}`).join("\n")}`,
    k.content?.testimonials?.length && `Customer reviews on the website:\n${k.content.testimonials.map((t) => `- "${t.quote}"${t.name ? ` (${t.name})` : ""}`).join("\n")}`,
    k.socialLinks?.length && `Social media: ${k.socialLinks.map((l) => `${l.name} ${l.url}`).join(", ")}`,
    k.mapUrl && `Google Maps: ${k.mapUrl}`,
    `Website text:\n${text}`,
    k.library?.pages?.length &&
      `Other pages of the website:\n${k.library.pages
        .filter((p) => p.title !== "Home")
        .map((p) => `### ${p.title} (${p.url})\n${p.text}`)
        .join("\n\n")
        .slice(0, pagesMax)}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/* --------------------------------------------------------- workflow analysis */
const ANALYSIS_SHAPE = `{
  "summary": "two sentences for the owner",
  "roast": ["3 short lines"],
  "workflows": [
    {
      "id": "id of the draft item, or a new short id",
      "name": "...",
      "channel": "one of: ${CHANNELS.join(", ")}",
      "trigger": "a real customer message",
      "description": "one sentence",
      "shareOfMessages": 0.0,
      "repetitiveness": 0.0,
      "dataAvailability": 0.0,
      "risk": 0.0,
      "agentSteps": ["3 or 4 steps"],
      "guardrails": ["2 guardrails"]
    }
  ]
}`;
/** Tidies the model's answer; null when it is too far off to use. */
function checkAnalysis(j) {
  if (!Array.isArray(j.workflows)) return null;
  const workflows = [];
  for (const w of j.workflows) {
    const nums = [unit(w?.shareOfMessages), unit(w?.repetitiveness), unit(w?.dataAvailability), unit(w?.risk)];
    const name = str(w?.name, 80);
    if (!name || nums.includes(null)) continue;
    workflows.push({
      id: str(w.id, 40),
      name,
      channel: CHANNELS.includes(w.channel) ? w.channel : "chat",
      trigger: str(w.trigger, 200),
      description: str(w.description, 300),
      shareOfMessages: nums[0],
      repetitiveness: nums[1],
      dataAvailability: nums[2],
      risk: nums[3],
      agentSteps: list(w.agentSteps, 4, 200),
      guardrails: list(w.guardrails, 3, 200),
    });
  }
  const summary = str(j.summary, 600);
  if (workflows.length < 3 || !summary) return null;
  return { summary, roast: list(j.roast, 4, 200), workflows };
}

export async function aiAnalyze(scan, answers, draft) {
  if (!aiEnabled()) return null;
  const k = scan.knowledge;
  const got = await aiJSON({
    system: () =>
      "You audit small businesses for customer-message automation. Be concrete, plain-spoken and honest. Never invent facts that are not on the website. Complaints, refunds, medical advice and anything sensitive always get risk of 0.8 or more.",
    messages: [
      {
        role: "user",
        content: `Here is what we crawled from a business website, the owner's answers, and a draft list of workflows from our rules engine.

<website>
${knowledgeBlock({ ...k, text: k.text.slice(0, 12000) }, true)}
</website>

<owner_answers>
Messages per day: ${answers.dailyMessages}
Who replies: ${answers.replier}
Reminders: ${answers.reminders}
Replies after hours: ${answers.afterHours}
</owner_answers>

<draft_workflows>
${draft.map((w) => `- ${w.id}: ${w.name} (repetitiveness ${w.repetitiveness}, data ${w.dataAvailability.toFixed(2)}, risk ${w.risk})`).join("\n")}
</draft_workflows>

Refine the draft into 5 to 7 workflows that fit THIS business specifically (rename them for its trade, drop ones that don't apply, add at most two missing ones). For each give: shareOfMessages (0 to 1, all shares summing to about 1), repetitiveness, dataAvailability (how much of the answer is already on the website) and risk, each 0 to 1; a trigger written as a real customer message (Hinglish is fine); a one-sentence description; 3 or 4 agentSteps; 2 guardrails. Keep the id of draft items you keep.
Also write: summary, two sentences for the owner; roast, 3 short funny but kind lines about gaps you actually saw on the site.`,
      },
    ],
    shape: ANALYSIS_SHAPE,
    check: checkAnalysis,
    maxTokens: 8000,
    live: false,
  });
  if (!got) return null;
  const out = got.data;
  const workflows = out.workflows.slice(0, 7).map((w, i) => {
    const perDay = answers.dailyMessages * Math.min(1, Math.max(0, w.shareOfMessages));
    const wf = finalizeWorkflow(
      {
        id: w.id || `wf${i}`,
        name: w.name,
        channel: w.channel,
        channels: [w.channel],
        trigger: w.trigger,
        description: w.description,
        volume: volumeFactor(perDay),
        repetitiveness: w.repetitiveness,
        dataAvailability: w.dataAvailability,
        risk: w.risk,
        reason: "",
        agentSteps: w.agentSteps.slice(0, 4),
        guardrails: w.guardrails.slice(0, 3),
      },
      perDay,
    );
    return { ...wf, reason: reasonFor(wf) };
  });
  if (workflows.length < 3) return null;
  return { workflows, summary: out.summary, roast: out.roast.slice(0, 4) };
}

/* ----------------------------------------------------------------- the agent */
const REPLY_SHAPE = `{
  "reply": "your message to the customer",
  "intent": "one of: ${INTENTS.join(", ")}",
  "escalate": true or false,
  "source": "the part of the business info you used, or none"
}`;
function checkReply(j) {
  const reply = str(j.reply, 1200);
  if (!reply) return null;
  const intent = INTENTS.includes(j.intent) ? j.intent : "other";
  // If the model forgot the flag, sensitive topics still go to the owner.
  const escalate = typeof j.escalate === "boolean" ? j.escalate : ["complaint", "refund", "medical"].includes(intent);
  return { reply, intent, escalate, source: str(j.source, 80) || "none" };
}

export async function aiReply(k, history, message) {
  if (!aiEnabled()) return null;
  const system = (compact) => `You are the WhatsApp assistant for ${k.name}. Reply the way a warm, efficient front-desk person would: short (1 to 3 sentences), friendly, and in the customer's language. If they write Hinglish (Hindi in English letters), reply in Hinglish using English letters, never Devanagari script.

Rules:
- Answer ONLY from the business information below. If the answer is not there, say you'll check with the team, and set escalate to true.
- Never invent prices, discounts, offers, availability or policies.
- The main thing customers want here: ${profileOf(k).goal.cta}. When someone wants it, collect ${profileOf(k)
    .goal.fields.map((f) => f.label.toLowerCase())
    .join(", ")}, then say the team will get back to confirm. Set escalate to true so the owner follows up. Don't push this on people who are only asking a question.
- Symptoms, pain or any medical question: never give medical advice, diagnoses or medicine names. Say the doctor's team will call, offer the earliest appointment, intent "medical", escalate true.
- Refund requests: apologise, say only that the owner will contact them personally, and never say whether a refund will be given. Use intent "refund" and set escalate to true.
- Complaints, anger, health or safety concerns: apologise sincerely, promise nothing about money, say the owner will personally reach out soon, and set escalate to true.
- source: name the part of the business info you used (for example "Price list" or "Opening hours"), or "none".

<business_info>
${knowledgeBlock(k, compact)}
</business_info>`;
  const messages = [];
  for (const t of history.slice(-10)) {
    const role = t.role === "customer" ? "user" : "assistant";
    const last = messages[messages.length - 1];
    if (last && last.role === role) last.content = `${last.content}\n${t.text}`;
    else messages.push({ role, content: t.text });
  }
  if (messages[0]?.role === "assistant") messages.shift();
  const last = messages[messages.length - 1];
  if (last && last.role === "user") last.content = `${last.content}\n${message}`;
  else messages.push({ role: "user", content: message });
  const got = await aiJSON({ system, messages, shape: REPLY_SHAPE, check: checkReply, maxTokens: 2000, live: true });
  if (!got) return null;
  const p = got.data;
  return { reply: p.reply, intent: p.intent, escalate: p.escalate, source: p.source, engine: "ai", provider: got.provider };
}
