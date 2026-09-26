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
  ["thanks", /^(thanks?|thank you|thx|ty|ok+|okay|shukriya|dhanyavad|great|cool|perfect|done|theek hai|thik hai)\b[\s!.🙏👍]*$/i],
];

const MEDICAL = /pain|dard|swell|sujan|bleed|khoon|fever|bukhar|symptom|ache|infection|dawai|dawa|medicine|tablet|dose|prescri|emergency|urgent|broken tooth|toot gaya|allerg/i;

const STOP = new Set(
  "the a an is are for of to in on and or me my you your i we what how much price cost rate kitna kitne kitni ka ki ke hai hain kya do does can please pls plz bhai ji aap mujhe batao bata ye yeh wo is it charge charges".split(" "),
);

const SYNONYMS: Record<string, string[]> = {
  rct: ["root", "canal", "treatment"],
  dard: ["pain"],
  daant: ["tooth", "teeth", "dental"],
  teeth: ["tooth"],
  baal: ["hair"],
  chehra: ["face", "facial"],
  fee: ["cost", "price"],
  fees: ["cost", "price"],
  charges: ["cost", "price"],
  rate: ["cost", "price"],
  kitna: ["cost", "price"],
  kitne: ["cost", "price"],
  timing: ["hour", "open"],
  timings: ["hour", "open"],
  parking: ["park"],
  ac: ["air", "condition"],
  appointment: ["book", "booking"],
  hurt: ["pain"],
  painful: ["pain"],
  bridal: ["bride"],
  shaadi: ["bride", "wedding"],
  ghar: ["home"],
};

const GENERIC = new Set(["cost", "price", "much", "kya", "service", "treatment", "list", "all", "your", "rate", "charge"]);

const stem = (w: string) => w.replace(/(ful|ing)$/, "").replace(/([^s])s$/, "$1");

export const tokens = (s: string) => {
  const out: string[] = [];
  for (const w of s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
    if (w.length < 2) continue;
    for (const syn of SYNONYMS[w] ?? []) out.push(stem(syn));
    if (!STOP.has(w)) out.push(stem(w));
  }
  return [...new Set(out)];
};

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

function matchFaq(msg: string, k: SiteKnowledge, min = 0.34) {
  const q = new Set(tokens(msg));
  let best: { a: string; s: number } | null = null;
  for (const f of k.faqs) {
    const t = tokens(f.q);
    const s = t.filter((w) => q.has(w)).length / Math.max(1, t.length);
    if (s >= min && (!best || s > best.s)) best = { a: f.a, s };
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
  const medical = k.businessType === "clinic" && MEDICAL.test(message);
  const hoursQ = /\b(open|opening|close|closed|khul|khula|khule|band|timing|timings|kab tak|kab se|holiday|chutti)\b/i.test(message) && !/\bbook|appointment|slot\b/i.test(message);
  const intent = medical ? "medical" : hoursQ ? "hours" : (PATTERNS.find(([, re]) => re.test(message))?.[0] ?? "other");
  const T = (en: string, hin: string) => (hi ? hin : en);
  const base = { intent, engine: "rules" as const };

  // The business's own FAQ answer beats any generic rule, even for health questions it has answered itself.
  if (intent !== "refund" && intent !== "complaint" && intent !== "price" && intent !== "booking") {
    const strong = matchFaq(message, k, 0.6);
    if (strong) return { ...base, intent: "service_info", reply: strong, escalate: false, source: "FAQ" };
  }

  if (intent === "hours" || intent === "location" || intent === "other") {
    const faq = matchFaq(message, k);
    if (faq) return { ...base, intent: "service_info", reply: faq, escalate: false, source: "FAQ" };
  }

  switch (intent) {
    case "medical":
      return {
        ...base,
        reply: T(
          `I'm sorry you're going through this. I can't give medical advice, but I've alerted the doctor's team and they'll call you shortly. Would you like the earliest appointment?`,
          `Sorry aapko takleef ho rahi hai. Main medical advice nahi de sakta, par maine doctor ki team ko alert kar diya hai, wo jaldi call karenge. Sabse pehla appointment book kar du?`,
        ),
        escalate: true,
        source: "Medical safety rule",
      };
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
    case "thanks":
      return { ...base, reply: T("You're welcome! Anything else I can help with?", "Aapka swagat hai! Aur kuch madad chahiye?"), escalate: false, source: "none" };
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
      const costFaq = matchFaq(message, { ...k, faqs: k.faqs.filter((f) => /cost|price|fee|charge|₹|rs\.?\s?\d/i.test(`${f.q} ${f.a}`)) }, 0.3);
      if (costFaq) return { ...base, reply: costFaq, escalate: false, source: "FAQ" };
      const specific = tokens(message).filter((w) => !GENERIC.has(w));
      if (specific.length && k.prices.length) {
        return {
          ...base,
          reply: T(
            `I don't see that exact price on our website, so I've asked the team to confirm it for you. They'll reply shortly.`,
            `Iska exact price website pe nahi hai, maine team se confirm karne ko bol diya hai. Thodi der mein reply aayega.`,
          ),
          escalate: true,
          source: "none",
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
  const found = /do you|d'you|kya aap|hota hai|hoti hai|karte ho|karte hai|available|offer|provide|milta|milegi/i.test(message) ? matchPrices(message, k.prices) : [];
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
