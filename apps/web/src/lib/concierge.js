import "server-only";

/** Places the guide can send a visitor. The model and the rules both pick from this list, so links never break. */
export const ACTIONS = {
  demo: { label: "Try the demo salon", href: "/scan?url=demo" },
  analyze: { label: "Analyze my website", href: "/#product" },
  how: { label: "See how it works", href: "/how" },
  owner: { label: "See the owner's view", href: "/owner-demo" },
  integrate: { label: "Add it to my website", href: "/integrate" },
  setup: { label: "Book a free setup call", href: "/setup" },
  find: { label: "Find my business by name", href: "/find" },
};

const FACTS = `Weblyy's main job: give every small business the website it should have, made for its kind of business. Paste a website URL, business name or Instagram handle. No coding needed.
Different businesses get different things: a school gets admissions, fee structure, notices, facilities and an admission enquiry form (no appointment booking). A restaurant gets its menu, table requests and directions. A salon or clinic gets prices/doctors and booking. A shop gets products, stock questions and directions. A coaching institute gets courses, batches and a free demo class. A gym gets plans and a free trial.
Steps: 1) Weblyy reads the site in a real browser and searches the web for your listings (Google Maps, Justdial, ratings). 2) You get a score out of 100 showing what a business like yours is missing, with a before/after view. 3) One click builds the new website from your real details, with the right main button and everything Google and AI apps need (structured data, FAQs).
No website, only Instagram? Weblyy tells you plainly and builds a website for you from your Instagram and business details.
Extras, only where they help: an assistant that answers common questions in English and Hinglish, enquiry follow-ups, booking reminders for appointment businesses, a QR poster, WhatsApp. They are not forced on every business.
Every enquiry lands in one Lead Center so none are lost. Complaints, refunds and medical questions always go to the owner.
Add to an existing site: one line of script, or use the new website Weblyy builds.
Setup: free. Not technical? Book a free setup call and the Weblyy team connects it for you.
Who it's for: schools, salons, clinics, coaching institutes, restaurants, gyms, shops and local services in India.
Pricing: using Weblyy and the setup call are free right now. Do not quote any other price.`;

// --------------------------------------------------------------- rules engine

const HINGLISH = /\b(kya|kaise|kitna|kitne|hai|hain|kaun|kyu|kyun|mujhe|mera|meri|apna|karo|kar|chahiye|batao|bhai|ji)\b/i;
const URLISH = /((https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?)/i;

const TOPICS = [
  {
    re: /^\s*(hi+|hello|hey|namaste|hola|yo)[\s!.,]*(there|ji|bhai)?[\s!.]*$/i,
    en: "Hi! I'm the Weblyy guide. Ask me anything about making your business AI-ready, or paste your website and I'll analyze it.",
    hi: "Namaste! Main Weblyy guide hoon. Kuch bhi poochiye, ya apni website ka link daaliye, main analyze kar deta hoon.",
    actions: ["demo", "how"],
  },
  {
    re: /\b(price|pricing|cost|charge|fee|paid|free|kitna|kitne|paisa|rupees?|₹)\b/i,
    en: "Weblyy is free to use right now, and so is the setup call. Analyze your site, switch everything on, and pay nothing.",
    hi: "Abhi Weblyy bilkul free hai, aur setup call bhi free hai. Website analyze karo aur sab kuch on karo, koi charge nahi.",
    actions: ["analyze", "setup"],
  },
  {
    re: /\b(score|readiness|audit|report|check)\b/i,
    en: "The AI Readiness Score rates your business out of 100 across five areas: Website, AI Customer Agent, Lead Capture, AI Search and Automation. You see where you are now and where you land with Weblyy.",
    hi: "AI Readiness Score aapke business ko 100 mein se rate karta hai, 5 areas mein: Website, AI Agent, Lead Capture, AI Search aur Automation. Abhi kahan ho aur Weblyy ke baad kahan pahunchoge, dono dikhta hai.",
    actions: ["demo", "analyze"],
  },
  {
    re: /\b(agent|chat ?bot|bot|assistant|reply|replies|answer|hinglish|24\/?7)\b/i,
    en: "The assistant is an optional extra. Where it helps (salons, clinics, coaching), it answers common questions 24/7 in English and Hinglish from your real details and hands complaints to you. It isn't forced on businesses that don't need it.",
    hi: "Assistant ek optional extra hai. Jahan kaam aata hai (salon, clinic, coaching), wahan 24/7 English aur Hinglish mein aapki asli details se jawab deta hai aur complaints aap tak bhejta hai. Jinhe zarurat nahi, unpe zabardasti nahi lagate.",
    actions: ["demo", "owner"],
  },
  {
    re: /\b(whats ?app|wa\.me|qr|poster|instagram|insta)\b/i,
    en: "The same agent works on your website, a chat link for your Instagram bio, a QR poster for your counter, and WhatsApp through Twilio.",
    hi: "Wahi agent aapki website, Instagram bio ke chat link, counter ke QR poster aur WhatsApp (Twilio se) sab jagah kaam karta hai.",
    actions: ["integrate", "setup"],
  },
  {
    re: /\b(lead|leads|customer details|enquir(y|ies)|follow.?up|crm)\b/i,
    en: "Every interested visitor becomes a lead in your Lead Center: name, number, what they want, and a hot, warm or cold score. Follow-ups are drafted for you and you get an alert for the hot ones.",
    hi: "Har interested visitor Lead Center mein lead ban jata hai: naam, number, kya chahiye, aur hot/warm/cold score. Follow-up ready milta hai aur hot leads ka alert aata hai.",
    actions: ["owner", "demo"],
  },
  {
    re: /\b(seo|google|search|chatgpt|gemini|perplexity|rank|ranking|maps|justdial)\b/i,
    en: "Weblyy checks how you show up online (your site, Google Maps, Justdial, ratings) and adds structured data, FAQs and an AI summary so AI assistants can understand your business. No ranking is guaranteed.",
    hi: "Weblyy check karta hai aap online kaise dikhte ho (website, Google Maps, Justdial, ratings), aur structured data, FAQs aur AI summary add karta hai taaki AI assistants aapko samajh sakein. Ranking guaranteed nahi hai.",
    actions: ["analyze", "demo"],
  },
  {
    re: /\b(website|redesign|makeover|new site|mobile)\b/i,
    en: "Weblyy builds your new website from your real details, made for your kind of business: a school gets admissions and fees, a restaurant its menu and table requests, a salon its prices and booking. You see it next to your current site.",
    hi: "Weblyy aapki asli details se nayi website banata hai, aapke business ke hisaab se: school ko admissions aur fees, restaurant ko menu aur table request, salon ko prices aur booking. Purani site ke saath dikhta hai.",
    actions: ["demo", "analyze"],
  },
  {
    re: /\b(integrat\w*|embed|install|script|widget|wordpress|wix|shopify|code|coding|developer)\b/i,
    en: "No coding. One line of script adds the chat bubble to any website (WordPress, Wix, Shopify, anything). Or share the chat link and QR code.",
    hi: "Coding nahi chahiye. Ek line ka script kisi bhi website pe chat bubble laga deta hai (WordPress, Wix, Shopify). Ya chat link aur QR share karo.",
    actions: ["integrate", "setup"],
  },
  {
    re: /\b(setup|set up|call|help me|not technical|team|contact|human|talk)\b/i,
    en: "Not technical? Book a free setup call. The Weblyy team connects your agent to your website, WhatsApp and Google for you.",
    hi: "Technical nahi ho? Free setup call book karo. Weblyy team aapki website, WhatsApp aur Google pe sab connect kar degi.",
    actions: ["setup"],
  },
  {
    re: /\b(how|work|works|steps|start|kaise|process)\b/i,
    en: "Paste your website, shop name or Instagram. Weblyy shows what a business like yours is missing, then builds the website it should have in one click. About a minute.",
    hi: "Website, shop ka naam ya Instagram daalo. Weblyy dikhata hai aapke jaise business mein kya missing hai, phir ek click mein sahi website bana deta hai. Lagbhag ek minute.",
    actions: ["analyze", "how"],
  },
  {
    re: /\b(who|school|salon|clinic|doctor|dentist|coaching|restaurant|cafe|gym|shop|store|small business|msme)\b/i,
    en: "Weblyy is for local businesses in India: schools, salons, clinics, coaching institutes, restaurants, gyms and shops. Each gets a website made for its kind of business.",
    hi: "Weblyy India ke local businesses ke liye hai: schools, salons, clinics, coaching, restaurants, gyms aur shops. Har ek ko uske hisaab se website milti hai.",
    actions: ["demo", "analyze"],
  },
  {
    re: /\b(no website|don'?t have|dont have|without website|only instagram)\b/i,
    en: "No website, only Instagram? Weblyy will tell you plainly, then build a proper website for you from your Instagram and business details.",
    hi: "Website nahi hai, sirf Instagram? Weblyy saaf bata dega, aur aapke Instagram aur business details se ek achhi website bana dega.",
    actions: ["find"],
  },
  {
    re: /\b(safe|privacy|data|secure|security|refund|complain\w*|medical)\b/i,
    en: "The agent never invents prices or offers. Complaints, refunds and medical questions always go straight to you, with an alert.",
    hi: "Agent kabhi prices ya offers invent nahi karta. Complaints, refunds aur medical sawal hamesha seedhe aap tak jaate hain, alert ke saath.",
    actions: ["owner"],
  },
  {
    re: /\b(weblyy|what (is|does) (it|this)|about (you|this|it)|ye kya hai|yeh kya hai)\b/i,
    en: "Weblyy gives your business the website it should have. It checks your site against what a business like yours needs (a school needs admissions and fees, a restaurant needs its menu), then builds the right one. No website? It builds one from your Instagram.",
    hi: "Weblyy aapke business ko sahi website deta hai. Aapke jaise business ko kya chahiye (school ko admissions aur fees, restaurant ko menu), wo check karke sahi website bana deta hai. Website nahi hai? Instagram se bana deta hai.",
    actions: ["demo", "how"],
  },
];

function hostOf(text) {
  const m = text.match(URLISH);
  if (!m) return null;
  const raw = m[1].replace(/[),.]+$/, "");
  if (/@/.test(raw)) return null;
  try {
    const u = new URL(/^https?:/i.test(raw) ? raw : `https://${raw}`);
    return /\.[a-z]{2,}$/i.test(u.hostname) ? u.href.replace(/\/$/, "") : null;
  } catch {
    return null;
  }
}

function toActions(ids) {
  return [...new Set(ids)].filter((id) => ACTIONS[id]).slice(0, 3).map((id) => ({ id, ...ACTIONS[id] }));
}

/** Attach an "Analyze <site>" action when the visitor pasted a website. */
function withUrl(text, actions) {
  const url = hostOf(text);
  if (!url) return actions;
  return [{ id: "scan", label: `Analyze ${new URL(url).hostname.replace(/^www\./, "")}`, href: `/scan?url=${encodeURIComponent(url)}`, primary: true }, ...actions].slice(0, 3);
}

export function rulesAnswer(message) {
  const hi = HINGLISH.test(message);
  if (hostOf(message) && message.trim().split(/\s+/).length <= 3) {
    return {
      reply: hi ? "Badhiya! Is website ko analyze karte hain. Ek minute mein AI Readiness Score mil jayega." : "Great, let's analyze that site. You'll get its AI Readiness Score in about a minute.",
      actions: withUrl(message, []),
      engine: "rules",
    };
  }
  const t = TOPICS.find((x) => x.re.test(message));
  if (!t) {
    return {
      reply: hi
        ? "Yeh main pakka nahi bata sakta. Main Weblyy ke features, pricing aur setup ke baare mein bata sakta hoon, ya apni website ka link daaliye."
        : "I'm not sure about that one. I can tell you about Weblyy's features, pricing and setup, or paste your website and I'll analyze it.",
      actions: withUrl(message, toActions(["demo", "setup"])),
      engine: "rules",
    };
  }
  return { reply: hi ? t.hi : t.en, actions: withUrl(message, toActions(t.actions)), engine: "rules" };
}

/** Optional AI answer. Not connected in this build, so the guide answers from the rules above. */
export async function aiAnswer() {
  return null;
}
