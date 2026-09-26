import type { AgentReply, PriceItem, SiteKnowledge } from "./types";

const HINGLISH = /\b(kya|hai|hain|kitna|kitne|kitni|kab|kaha|kahan|mujhe|chahiye|aap|kar|karna|karwana|milega|hoga|kal|aaj|bhai|ji|acha|accha|nahi|haan|batao|bata|wala|wali)\b/i;

const PATTERNS: [AgentReply["intent"], RegExp][] = [
  ["refund", /refund|money back|paise? wapas|paisa wapas|return my/i],
  ["complaint", /complain|not happy|unhappy|worst|terrible|bad (service|experience)|kharab|bekaar|bakwas|bura|galat|angry|disappoint|rude|burn|rash|allerg|itch|pain|hurt/i],
  ["booking", /\bbook|appointment|slot|reserv|schedule|\bfree hai|available|availability|khali|aana hai|aa sakt|aa jau|kal |aaj |tomorrow|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\d\s?(am|pm|baje)/i],
  ["price", /price|cost|rate|charge|kitn[aei]|how much|fee|₹|\brs\b|package|offer|discount/i],
  ["hours", /timing|\btime\b|open|close|khul|band |kab tak|kab se|hours|sunday|holiday/i],
  ["location", /where|address|location|kaha|kahan|map|direction|parking|reach|metro/i],
  ["greeting", /^(hi+|hello|hey|namaste|namaskar|good (morning|evening|afternoon)|hlo|helo)\b[\s!.]*$/i],
];

const STOP = new Set(
  "the a an is are for of to in on and or me my you your i we what how much price cost rate kitna kitne kitni ka ki ke hai hain kya do does can please pls plz bhai ji aap mujhe batao bata ye yeh wo is it charge charges".split(" "),
);

const tokens = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => w.replace(/(ing|es|s)$/, ""));

function matchPrices(msg: string, prices: PriceItem[]): PriceItem[] {
  const q = new Set(tokens(msg));
  if (!q.size) return [];
  return prices
    .map((p) => {
      const t = tokens(p.name);
      const hits = t.filter((w) => q.has(w)).length;
      return { p, s: hits / Math.max(1, t.length) + hits * 0.5 };
    })
    .filter((x) => x.s >= 0.5)
    .sort((a, b) => b.s - a.s)
    .filter((x, _, all) => x.s >= all[0].s * 0.85)
    .slice(0, 3)
    .map((x) => x.p);
}

function matchFaq(msg: string, k: SiteKnowledge) {
  const q = new Set(tokens(msg));
  let best: { a: string; s: number } | null = null;
  for (const f of k.faqs) {
    const t = tokens(f.q);
    const s = t.filter((w) => q.has(w)).length / Math.max(1, t.length);
    if (s >= 0.34 && (!best || s > best.s)) best = { a: f.a, s };
  }
  return best?.a ?? null;
}

function when(msg: string): string {
  const day = msg.match(/\b(today|tomorrow|aaj|kal|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[0];
  const time = msg.match(/\b\d{1,2}(:\d{2})?\s?(am|pm|baje)\b/i)?.[0];
  return [day, time].filter(Boolean).join(" ");
}

export function rulesReply(k: SiteKnowledge, message: string): AgentReply {
  const hi = HINGLISH.test(message);
  const intent = PATTERNS.find(([, re]) => re.test(message))?.[0] ?? "other";
  const T = (en: string, hin: string) => (hi ? hin : en);
  const base = { intent, engine: "rules" as const };

  if (intent === "hours" || intent === "location" || intent === "other") {
    const faq = matchFaq(message, k);
    if (faq) return { ...base, intent: "service_info", reply: faq, escalate: false, source: "FAQ" };
  }

  switch (intent) {
    case "refund":
    case "complaint":
      return {
        ...base,
        reply: T(
          `I'm really sorry to hear that. I've alerted the owner right now, and they'll personally get back to you shortly to sort it out.`,
          `Bahut sorry ki aapko ye experience hua. Maine owner ko abhi alert kar diya hai, wo khud aapse jaldi baat karenge.`,
        ),
        escalate: true,
        source: "Escalation rule",
      };
    case "greeting":
      return {
        ...base,
        reply: T(
          `Hi! Welcome to ${k.name}. Ask me about prices, timings or booking a slot.`,
          `Namaste! ${k.name} mein aapka swagat hai. Price, timing ya booking ke baare mein puchiye.`,
        ),
        escalate: false,
        source: "none",
      };
    case "price": {
      const found = matchPrices(message, k.prices);
      if (found.length) {
        const list = found.map((p) => `${p.name}: ${p.price}`).join(", ");
        return {
          ...base,
          reply: T(`${list}. Want me to book a slot for you?`, `${list}. Aapke liye slot book kar du?`),
          escalate: false,
          source: "Price list",
        };
      }
      if (k.prices.length) {
        const top = k.prices.slice(0, 3).map((p) => `${p.name} ${p.price}`).join(", ");
        return {
          ...base,
          reply: T(
            `Some popular ones: ${top}. Tell me the exact service and I'll share its price.`,
            `Kuch popular services: ${top}. Exact service batayiye, main price bata deta hu.`,
          ),
          escalate: false,
          source: "Price list",
        };
      }
      return {
        ...base,
        reply: T(`Let me check the exact price with the team and get back to you in a few minutes.`, `Exact price main team se confirm karke thodi der mein batata hu.`),
        escalate: true,
        source: "none",
      };
    }
    case "booking": {
      const slot = when(message);
      return {
        ...base,
        reply: slot
          ? T(`Noted ${slot}! Which service would you like? The team will confirm your slot in a few minutes.`, `${slot} note kar liya! Kaunsi service chahiye? Team kuch minute mein slot confirm karegi.`)
          : T(`Happy to book you in! Which day and time works, and for which service?`, `Zaroor! Kaunsa din aur time theek rahega, aur kaunsi service?`),
        escalate: Boolean(slot),
        source: k.hours.length ? "Opening hours" : "Booking rule",
      };
    }
    case "hours":
      if (k.hours.length)
        return { ...base, reply: T(`We're open ${k.hours[0]}.`, `Hum ${k.hours[0]} khule hain.`), escalate: false, source: "Opening hours" };
      break;
    case "location":
      if (k.address)
        return {
          ...base,
          reply: T(`We're at ${k.address}. Maps: https://maps.google.com/?q=${encodeURIComponent(k.address)}`, `Hum yaha hain: ${k.address}. Maps: https://maps.google.com/?q=${encodeURIComponent(k.address)}`),
          escalate: false,
          source: "Address",
        };
      break;
  }

  const faq = matchFaq(message, k);
  if (faq) return { ...base, intent: "service_info", reply: faq, escalate: false, source: "FAQ" };
  const found = matchPrices(message, k.prices);
  if (found.length)
    return {
      ...base,
      intent: "service_info",
      reply: T(`Yes, we do! ${found[0].name} is ${found[0].price}. Shall I book it?`, `Haan ji, hota hai! ${found[0].name} ${found[0].price} ka hai. Book kar du?`),
      escalate: false,
      source: "Price list",
    };
  return {
    ...base,
    reply: T(`Good question! Let me check with the team and reply in a few minutes.`, `Acha sawaal hai! Main team se check karke thodi der mein batata hu.`),
    escalate: true,
    source: "none",
  };
}
