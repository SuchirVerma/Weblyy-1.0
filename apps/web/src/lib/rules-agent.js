import { profileOf } from "./profiles";
const HINGLISH =
  /\b(kya|hai|hain|kitna|kitne|kitni|kab|kaha|kahan|mujhe|chahiye|aap|kar|karna|karwana|milega|hoga|kal|aaj|bhai|ji|acha|accha|nahi|haan|batao|bata|wala|wali)\b/i;
const PATTERNS = [
  ["refund", /refund|money back|paise? wapas|paisa wapas|return my/i],
  [
    "services",
    /what (all )?(services|treatments|courses|facilities|classes|programs|products|dishes)|which (services|treatments|courses|classes|programs)|(services|treatments|courses|facilities|classes) (do|you|offer|provide|available)|kya kya|kaun kaun|kaunsi services|list of (services|treatments|courses)|\b(your|the) menu\b/i,
  ],
  [
    "complaint",
    /complain|not happy|unhappy|worst|terrible|bad (service|experience)|kharab|bekaar|bakwas|bura|galat|angry|disappoint|rude|burn|rash|allerg|itch|pain|hurt/i,
  ],
  [
    "booking",
    /\bbook|appointment|admission|enrol|dakhila|slot|reserv|schedule|\bfree hai|available|availability|khali|aana hai|aa sakt|aa jau|kal |aaj |tomorrow|today|sunday|monday|tuesday|wednesday|thursday|friday|saturday|\d\s?(am|pm|baje)/i,
  ],
  ["price", /price|cost|rate|charge|kitn[aei]|how much|fee|₹|\brs\b|package|offer|discount/i],
  ["hours", /timing|\btime\b|open|close|khul|band |kab tak|kab se|hours|sunday|holiday/i],
  ["location", /where|address|location|kaha|kahan|map|direction|parking|reach|metro/i],
  ["contact", /phone|\bnumber\b|contact|\bcall\b|mobile|whatsapp|e-?mail|mail id|baat kar/i],
  ["reviews", /review|rating|testimonial|feedback|\bstars?\b|log kya kehte/i],
  ["social", /instagram|\binsta\b|facebook|\bfb\b|youtube|linkedin|social media/i],
  ["about", /about (you|the|your|us)|who (are you|is|runs|owns)|owner|founder|doctor|\bdr\.?\s|experience|since when|established|qualification|staff|\bteam\b|faculty|teachers?|trainers?|chef/i],
  ["greeting", /^(hi+|hello|hey|namaste|namaskar|good (morning|evening|afternoon)|hlo|helo)\b[\s!.]*$/i],
  ["thanks", /^(thanks?|thank you|thx|ty|ok+|okay|shukriya|dhanyavad|great|cool|perfect|done|theek hai|thik hai)\b[\s!.🙏👍]*$/i],
];
const MEDICAL =
  /pain|dard|swell|sujan|bleed|khoon|fever|bukhar|symptom|ache|infection|dawai|dawa|medicine|tablet|dose|prescri|emergency|urgent|broken tooth|toot gaya|allerg/i;
const STOP = new Set(
  "the a an is are for of to in on and or me my you your i we what how much price cost rate kitna kitne kitni ka ki ke hai hain kya do does can please pls plz bhai ji aap mujhe batao bata ye yeh wo is it charge charges".split(
    " ",
  ),
);
const SYNONYMS = {
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
  doctor: ["dr", "dentist"],
  doctors: ["dr", "dentist"],
  principal: ["head"],
  clean: ["hygiene", "steril"],
  safai: ["clean", "hygiene"],
  brand: ["product"],
  // Schools write classes in Roman numerals.
  ...Object.fromEntries(["i", "ii", "iii", "iv", "v", "vi", "vii", "viii", "ix", "x", "xi", "xii"].map((r, i) => [String(i + 1), [r]])),
  brands: ["product"],
};
const GENERIC = new Set(["cost", "price", "much", "kya", "service", "treatment", "list", "all", "your", "rate", "charge"]);
const stem = (w) => w.replace(/(ful|ing)$/, "").replace(/([^s])s$/, "$1");
export const tokens = (s) => {
  const out = [];
  for (const w of s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)) {
    if (w.length < 2) continue;
    for (const syn of SYNONYMS[w] ?? []) out.push(stem(syn));
    if (!STOP.has(w)) out.push(stem(w));
  }
  return [...new Set(out)];
};
function matchPrices(msg, prices) {
  const q = new Set(tokens(msg));
  if (!q.size) return [];
  return prices
    .map((p) => {
      const t = tokens(p.name);
      const real = t.filter((w) => q.has(w) && !GENERIC.has(w)).length;
      // "registration fee" must not match "transport charges" just because both mean price.
      if (!real) return { p, s: 0 };
      const hits = t.filter((w) => q.has(w)).length;
      return { p, s: hits / Math.max(1, t.length) + hits * 0.5 };
    })
    .filter((x) => x.s >= 0.5)
    .sort((a, b) => b.s - a.s)
    .filter((x, _, all) => x.s >= all[0].s * 0.85)
    .slice(0, 3)
    .map((x) => x.p);
}
function matchFaq(msg, k, min = 0.34) {
  const q = new Set(tokens(msg));
  let best = null;
  for (const f of k.faqs) {
    const t = tokens(f.q);
    const s = t.filter((w) => q.has(w)).length / Math.max(1, t.length);
    if (s >= min && (!best || s > best.s)) best = { a: f.a, s };
  }
  return best?.a ?? null;
}
function when(msg) {
  const day = msg.match(/\b(today|tomorrow|aaj|kal|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i)?.[0];
  const time = msg.match(/\b\d{1,2}(:\d{2})?\s?(am|pm|baje)\b/i)?.[0];
  return [day, time].filter(Boolean).join(" ");
}
/** The next step the agent offers after answering, in the words this kind of business uses. */
const OFFER = {
  booking: ["Want me to book a slot for you?", "Aapke liye slot book kar du?"],
  reservation: ["Shall I request a table for you?", "Table book karwa du?"],
  admission: ["Would you like the admissions office to call you?", "Admission office se call karwa du?"],
  demo: ["Want to try a free demo class?", "Free demo class book kar du?"],
  trial: ["Want to book a free trial?", "Free trial book kar du?"],
  enquiry: ["Anything else you'd like to know?", "Aur kuch jaanna hai?"],
  quote: ["Shall I have the team call you back?", "Team se call back karwa du?"],
};
export function rulesReply(site, message) {
  const k = withLibrary(site);
  const P = profileOf(k);
  const hi = HINGLISH.test(message);
  const medical = k.businessType === "clinic" && MEDICAL.test(message);
  const hoursQ =
    /\b(open|opening|close|closed|khul|khula|khule|band|timing|timings|kab tak|kab se|holiday|chutti)\b/i.test(message) &&
    !/\bbook|appointment|slot\b/i.test(message);
  // A message carrying their phone or email is a lead; the lead step thanks them, so don't answer it as a question.
  const sharing = /\d{10}/.test(message.replace(/[\s-]/g, "")) || /\S+@\S+\.\w/.test(message);
  const matched = PATTERNS.find(([, re]) => re.test(message))?.[0] ?? "other";
  const intent = medical ? "medical" : hoursQ ? "hours" : matched === "contact" && sharing ? "other" : matched;
  const T = (en, hin) => (hi ? hin : en);
  const offer = () => T(...(OFFER[P.goal.id] ?? OFFER.enquiry));
  const base = { intent, engine: "rules" };
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
      return {
        ...base,
        reply: T("You're welcome! Anything else I can help with?", "Aapka swagat hai! Aur kuch madad chahiye?"),
        escalate: false,
        source: "none",
      };
    case "greeting":
      return {
        ...base,
        reply: T(
          `Hi! Welcome to ${k.name}. ${P.agent.greeting}`,
          `Namaste! ${k.name} mein aapka swagat hai. Jo bhi jaanna ho, puchiye.`,
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
          reply: `${list}. ${offer()}`,
          escalate: false,
          source: "Price list",
        };
      }
      const costFaq = matchFaq(message, { ...k, faqs: k.faqs.filter((f) => /cost|price|fee|charge|₹|rs\.?\s?\d/i.test(`${f.q} ${f.a}`)) }, 0.3);
      if (costFaq) return { ...base, reply: costFaq, escalate: false, source: "FAQ" };
      const priced = searchSite(k, message, { price: true });
      if (priced) return { ...base, reply: `${quote(priced, T)} ${offer()}`, escalate: false, source: priced.source };
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
        const top = k.prices
          .slice(0, 3)
          .map((p) => `${p.name} ${p.price}`)
          .join(", ");
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
        reply: T(
          `Let me check the exact price with the team and get back to you in a few minutes.`,
          `Exact price main team se confirm karke thodi der mein batata hu.`,
        ),
        escalate: true,
        source: "none",
      };
    }
    case "booking": {
      // "What documents are needed for admission?" is a question the website may answer; answer it, then offer the next step.
      if (/\b(what|which|how|criteria|eligib\w*|documents?|process|procedure|age|last date|dates?|required|requirements?|rules|kya|kaise|kaun|konsa|kitne)\b/i.test(message)) {
        const hit = searchSite(k, message);
        if (hit) return { ...base, intent: "service_info", reply: `${quote(hit, T)} ${offer()}`, escalate: false, source: hit.source };
      }
      const slot = when(message);
      if (P.goal.id === "admission")
        return {
          ...base,
          reply: T(
            "Happy to help with admission! Which class is it for? Share your name and number and the admissions office will call you.",
            "Admission ke liye zaroor! Kis class ke liye? Apna naam aur number bhej dijiye, admission office call karega.",
          ),
          escalate: true,
          source: "Admission rule",
        };
      if (P.goal.id === "enquiry" || P.goal.id === "quote")
        return {
          ...base,
          reply: T("Sure! Tell me what you need and your number, and the team will get back to you.", "Zaroor! Kya chahiye aur apna number bata dijiye, team aapse baat karegi."),
          escalate: true,
          source: "Enquiry rule",
        };
      return {
        ...base,
        reply: slot
          ? T(
              `Noted ${slot}! Which service would you like? The team will confirm your slot in a few minutes.`,
              `${slot} note kar liya! Kaunsi service chahiye? Team kuch minute mein slot confirm karegi.`,
            )
          : T(`Happy to book you in! Which day and time works, and for which service?`, `Zaroor! Kaunsa din aur time theek rahega, aur kaunsi service?`),
        escalate: Boolean(slot),
        source: k.hours.length ? "Opening hours" : "Booking rule",
      };
    }
    case "services": {
      const list = serviceNames(k);
      if (list.length)
        return {
          ...base,
          reply: T(
            `We offer ${joinList(list.slice(0, 8))}${list.length > 8 ? ", and more" : ""}. Ask me about any of them.`,
            `Hum ye services dete hain: ${joinList(list.slice(0, 8))}${list.length > 8 ? ", aur bhi" : ""}. Kisi ke baare mein bhi puchiye.`,
          ),
          escalate: false,
          source: k.prices.length ? "Price list" : "Services",
        };
      const intro = aboutText(k);
      if (intro) return { ...base, reply: T(`From our website: ${clip(intro, 300)}`, `Website pe likha hai: ${clip(intro, 300)}`), escalate: false, source: "About" };
      break;
    }
    case "contact": {
      const ways = [
        k.phones[0] && T(`call ${phone(k.phones[0])}`, `call karein ${phone(k.phones[0])}`),
        k.whatsapp[0] && k.whatsapp[0] !== "WhatsApp link" && phone(k.whatsapp[0]) !== phone(k.phones[0] ?? "") && `WhatsApp ${phone(k.whatsapp[0])}`,
        k.emails[0] && T(`email ${k.emails[0]}`, `email ${k.emails[0]}`),
      ].filter(Boolean);
      if (ways.length)
        return {
          ...base,
          reply: T(`You can ${joinList(ways, "or")}. Or just ask me here!`, `Aap ${joinList(ways, "ya")}. Ya yahin puchiye!`),
          escalate: false,
          source: "Contact details",
        };
      break;
    }
    case "reviews": {
      const t = k.content?.testimonials ?? [];
      if (t.length) {
        const pick = t.slice(0, 2).map((x) => `"${clip(x.quote, 140)}"${x.name ? ` (${x.name})` : ""}`);
        return {
          ...base,
          reply: T(`Here's what our customers say: ${pick.join(" ")}`, `Hamare customers kehte hain: ${pick.join(" ")}`),
          escalate: false,
          source: "Testimonials",
        };
      }
      break;
    }
    case "social": {
      const links = k.socialLinks ?? [];
      const want = links.find((l) => new RegExp(l.name.slice(0, 4), "i").test(message)) ?? null;
      const show = want ? [want] : links.slice(0, 3);
      if (show.length)
        return {
          ...base,
          reply: T(`Find us here: ${show.map((l) => `${l.name} ${l.url}`).join(" · ")}`, `Yaha follow karein: ${show.map((l) => `${l.name} ${l.url}`).join(" · ")}`),
          escalate: false,
          source: "Social links",
        };
      break;
    }
    case "about": {
      const general = /tell me about|about (you|us|your|the (clinic|school|salon|business|place|restaurant|gym|shop|store|centre|center|studio|academy|institute))|who are you|kaun ho/i.test(message);
      if (general && aboutText(k)) return { ...base, reply: clip(aboutText(k), 320), escalate: false, source: "About" };
      const hit = searchSite(k, message);
      if (hit) return { ...base, reply: quote(hit, T), escalate: false, source: hit.source };
      break;
    }
    case "hours":
      if (k.hours.length) return { ...base, reply: T(`We're open ${k.hours[0]}.`, `Hum ${k.hours[0]} khule hain.`), escalate: false, source: "Opening hours" };
      break;
    case "location":
      if (k.address)
        return {
          ...base,
          reply: T(
            `We're at ${k.address}. Maps: ${k.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(k.address)}`}`,
            `Hum yaha hain: ${k.address}. Maps: ${k.mapUrl || `https://maps.google.com/?q=${encodeURIComponent(k.address)}`}`,
          ),
          escalate: false,
          source: "Address",
        };
      break;
  }
  const faq = matchFaq(message, k);
  if (faq) return { ...base, intent: "service_info", reply: faq, escalate: false, source: "FAQ" };
  const found = /do you|d'you|kya aap|hota hai|hoti hai|karte ho|karte hai|available|offer|provide|milta|milegi/i.test(message)
    ? matchPrices(message, k.prices)
    : [];
  if (found.length)
    return {
      ...base,
      intent: "service_info",
      reply: T(
        `Yes, we do! ${found[0].name} is ${found[0].price}. ${OFFER[P.goal.id]?.[0] ?? ""}`.trim(),
        `Haan ji, hota hai! ${found[0].name} ${found[0].price} ka hai. ${OFFER[P.goal.id]?.[1] ?? ""}`.trim(),
      ),
      escalate: false,
      source: "Price list",
    };
  const hit = sharing ? null : searchSite(k, message);
  if (hit) return { ...base, intent: "service_info", reply: quote(hit, T), escalate: false, source: hit.source };
  return {
    ...base,
    reply: T(`Good question! Let me check with the team and reply in a few minutes.`, `Acha sawaal hai! Main team se check karke thodi der mein batata hu.`),
    escalate: true,
    source: "none",
  };
}

/* ------------------------------------------------------------------ the rest of the website */
const QUESTION = new Set(
  "what which who whom whose when where why how tell about any there have has get want need needed required require know give also bhi koi hota hoti hote karte karti ho kaun kaunsa kaunsi kab kaise kyu kyun kis se mein par aur sab hoga hogi hoge tha thi raha rahi chahiye milega milegi you your we our us do does did can could would will should".split(" "),
);
const phone = (p) => {
  const d = p.replace(/\D/g, "");
  const n = d.length === 12 && d.startsWith("91") ? d.slice(2) : d.length === 10 ? d : "";
  return n && /^[6-9]/.test(n) ? `+91 ${n.slice(0, 5)} ${n.slice(5)}` : p;
};
const aboutText = (k) => (k.content?.about ?? []).find((a) => a.length > 60) || k.description || "";
// Split into sentences without breaking "Mrs. Sharma" or "Dr. Kalra".
const SENTENCE = /(?<!\b(?:Mr|Mrs|Ms|Dr|Prof|St|No|Sr|Jr|vs|etc)\.)(?<=[.!?])\s+/;
/** Menus and button rows ("LOGIN Home Photo Gallery About") aren't answers: real sentences have lowercase words. */
function isProse(t) {
  const words = t.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  if (words.length < 3) return false;
  const caps = words.filter((w) => w.length > 1 && w === w.toUpperCase()).length;
  if (caps / words.length >= 0.5) return false;
  const lower = words.filter((w) => /^[a-z]/.test(w)).length;
  return words.length <= 12 || lower / words.length >= 0.4;
}
/** One group per word of the question: the word and its synonyms. A group counts once, however many members match. */
function groupsOf(message) {
  const out = [];
  for (const w of message.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/)) {
    if (w.length < 2) continue;
    const g = [...new Set([...(STOP.has(w) ? [] : [stem(w)]), ...(SYNONYMS[w] ?? []).map(stem)])].filter((x) => !GENERIC.has(x) && !QUESTION.has(x));
    if (g.length && !out.some((o) => o[0] === g[0])) out.push(g);
  }
  return out;
}
const near = (w, t) => t === w || (w.length >= 5 && t.startsWith(w)) || (w.length >= 6 && t.startsWith(w.slice(0, 6)));
const clip = (t, n) => (t.length > n ? `${t.slice(0, n - 1).replace(/\s+\S*$/, "")}…` : t);
function joinList(xs, word = "and") {
  return xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} ${word} ${xs[xs.length - 1]}`;
}
function serviceNames(k) {
  const seen = new Set();
  return [...k.prices.map((p) => p.name), ...(k.services ?? [])].filter((n) => {
    const key = n.toLowerCase().trim();
    if (!key || key.length > 60 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
/** Everything readable the scan kept, cut into short passages the assistant can quote. Built once per business. */
const indexes = new WeakMap();
function siteIndex(k) {
  let idx = indexes.get(k);
  if (idx) return idx;
  const passages = [];
  // `context` (the page's title) counts for matching but is never quoted: "Class XI" on the page title, "criteria" in the text.
  const add = (text, source, context = "") => {
    // A run of eight or more Capitalised Words is a menu ("Safety And Security Measures School Rules School Calendar…").
    const t = text
      .replace(/(?:(?:[A-Z][\w'’&/().-]*|of|and|&|\/|\(|\)|-|\d+\.?)\s+){8,}/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (t.length >= 30 && isProse(t) && !passages.some((p) => p.text === t)) {
      const toks = new Set(tokens(`${context} ${t}`));
      passages.push({ text: t, source, toks, list: [...toks] });
    }
  };
  if (k.description) add(k.description, "About");
  for (const a of k.content?.about ?? []) add(a, "About");
  for (const sec of k.content?.sections ?? []) add(`${sec.heading}: ${sec.text}`, sec.heading);
  // The raw page text, two sentences at a time, catches what the structured parts missed.
  const sentences = (k.text ?? "").split(new RegExp(`${SENTENCE.source}|\\n+`)).map((x) => x.trim()).filter((x) => x.split(" ").length >= 5);
  for (let i = 0; i < sentences.length; i += 2) add(sentences.slice(i, i + 2).join(" "), "Website");
  // Every other page the assistant read, credited to its page.
  for (const pg of k.library?.pages ?? []) {
    const ctx = pg.title === "Home" ? "" : pg.title;
    for (const sec of pg.sections ?? []) add(`${sec.heading}: ${sec.text}`, `page:${pg.title}`, ctx);
    const ss = (pg.text ?? "").split(new RegExp(`${SENTENCE.source}|\\n+`)).map((x) => x.trim()).filter((x) => x.split(" ").length >= 5);
    for (let i = 0; i < ss.length; i += 2) add(ss.slice(i, i + 2).join(" "), `page:${pg.title}`, ctx);
  }
  const df = new Map();
  for (const p of passages) for (const w of p.toks) df.set(w, (df.get(w) ?? 0) + 1);
  idx = { passages, df, n: passages.length };
  indexes.set(k, idx);
  return idx;
}
/**
 * The passage that best answers the question, or null. Most of the question's specific words must appear in it,
 * and at least one of them must be rare on the site, so the business's own name alone never counts as an answer.
 */
export function searchSite(k, message, { price = false } = {}) {
  const idx = siteIndex(k);
  if (!idx.n) return null;
  const groups = groupsOf(message);
  if (!groups.length) return null;
  const df = (w) => idx.passages.filter((p) => p.list.some((t) => near(w, t))).length;
  const gdf = groups.map((g) => Math.max(...g.map(df)));
  // A word the website never uses means the website can't answer this ("transport" on a site with no transport page).
  const missing = gdf.filter((d) => d === 0).length;
  const need = groups.length >= 3 ? Math.ceil(groups.length * 0.6) : groups.length;
  // An answer may skip a common word, never a specific one ("nursery", "implants"): that would be about something else.
  const specific = gdf.map((d) => d > 0 && d / idx.n < 0.2);
  let best = null;
  for (const p of idx.passages) {
    if (price && !/₹|\brs\.?\s?\d|\binr\b|\d+\s?\/-/i.test(p.text)) continue;
    const hitGroups = groups.map((g, i) => (g.some((w) => p.list.some((t) => near(w, t))) ? i : -1)).filter((i) => i >= 0);
    if (hitGroups.length < need) continue;
    if (missing) return null;
    if (specific.some((sp, i) => sp && !hitGroups.includes(i))) continue;
    if (!hitGroups.some((i) => gdf[i] / idx.n < 0.35)) continue;
    const score = hitGroups.reduce((a, i) => a + Math.log(1 + idx.n / gdf[i]), 0) + (p.source === "Website" || p.source.startsWith("page:") ? 0 : 0.3);
    if (!best || score > best.score) best = { ...p, hit: hitGroups.flatMap((i) => groups[i]), score };
  }
  if (!best) return null;
  // Quote the sentence(s) that carry the matched words, not the whole passage.
  const parts = best.text.split(SENTENCE);
  const has = (t, w) => tokens(t).some((x) => near(w, x));
  const ranked = parts.map((t, i) => ({ t, i, n: best.hit.filter((w) => has(t, w)).length })).filter((x) => x.n);
  const keep = ranked.sort((a, b) => b.n - a.n).slice(0, 2).sort((a, b) => a.i - b.i).map((x) => x.t);
  let text = (keep.length ? keep : parts).join(" ").replace(/#+\s*/g, "").trim();
  // A run-on block with no full stops: quote the words around the match, not the whole block.
  if (text.length > 240) {
    const words = text.split(/\s+/);
    const at = Math.max(0, words.findIndex((w) => best.hit.some((h) => tokens(w).some((x) => near(h, x)))));
    const from = Math.max(0, at - 8);
    text = `${from ? "…" : ""}${words.slice(from, from + 32).join(" ")}${from + 32 < words.length ? "…" : ""}`;
  }
  const page = best.source.startsWith("page:") ? best.source.slice(5) : "";
  return { text, page: page && page !== "Home" ? page : "", source: page ? `Website: ${page} page` : best.source === "Website" ? "Website" : `Website: ${best.source}` };
}
function quote(hit, T) {
  if (hit.page) return T(`From our ${hit.page} page: ${hit.text}`, `Hamare ${hit.page} page pe likha hai: ${hit.text}`);
  return T(`From our website: ${hit.text}`, `Website pe likha hai: ${hit.text}`);
}
/** The scan's knowledge plus the prices and FAQs found on every other page the assistant read. Built once per copy. */
const expanded = new WeakMap();
function withLibrary(k) {
  const pages = k.library?.pages;
  if (!pages?.length) return k;
  let out = expanded.get(k);
  if (out) return out;
  const byKey = (xs, key) => xs.filter((x, i) => xs.findIndex((y) => key(y) === key(x)) === i);
  out = {
    ...k,
    prices: byKey([...k.prices, ...pages.flatMap((p) => p.prices ?? [])], (p) => p.name.toLowerCase()).slice(0, 120),
    faqs: byKey([...k.faqs, ...pages.flatMap((p) => p.faqs ?? [])], (f) => f.q.toLowerCase()).slice(0, 80),
  };
  expanded.set(k, out);
  return out;
}
