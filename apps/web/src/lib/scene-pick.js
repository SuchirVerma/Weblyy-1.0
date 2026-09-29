/**
 * The 10 3D designs a redesigned website can open with, and how Weblyy picks one:
 * it reads the business's own words (name, services, prices, about text, the site's text)
 * and scores each design by the words that fit it, with a nudge from the detected business type.
 * Pure data and logic, safe on the server and in the browser.
 */
export const SCENES = [
  { key: "flow", name: "Flow", blurb: "A rolling wave of light" },
  { key: "helix", name: "Helix", blurb: "A turning DNA double helix" },
  { key: "bokeh", name: "Bokeh", blurb: "Soft glowing orbs drifting up" },
  { key: "silk", name: "Silk", blurb: "Flowing ribbons of light" },
  { key: "crystal", name: "Crystal", blurb: "A rotating faceted gem" },
  { key: "embers", name: "Embers", blurb: "Warm sparks rising" },
  { key: "rings", name: "Rings", blurb: "Pulsing energy rings" },
  { key: "constellation", name: "Constellation", blurb: "A network of connected stars" },
  { key: "grid", name: "Grid", blurb: "A moving neon horizon" },
  { key: "globe", name: "Globe", blurb: "A spinning world of points" },
];
export const SCENE_KEYS = SCENES.map((s) => s.key);

const RULES = {
  helix: ["dental", "dentist", "tooth", "teeth", "clinic", "hospital", "doctor", "medical", "physio", "physiotherapy", "diagnostic", "pathology", "pharmacy", "health", "surgery", "orthodontic", "implant", "homeopathy", "ayurveda", "veterinary", "eye care"],
  bokeh: ["salon", "spa", "beauty", "makeup", "make-up", "bridal", "nail", "nails", "hair", "skin", "parlour", "parlor", "facial", "waxing", "threading", "massage", "grooming", "unisex"],
  silk: ["boutique", "fashion", "saree", "lehenga", "designer", "tailor", "tailoring", "wedding", "florist", "flowers", "interior", "decor", "décor", "textile", "clothing", "apparel", "photography", "photographer", "events"],
  crystal: ["jewel", "jewellery", "jewelry", "diamond", "silver", "gold", "watch", "watches", "luxury", "gift", "gifts", "optical", "opticians", "perfume", "cosmetics store"],
  embers: ["restaurant", "cafe", "café", "bakery", "kitchen", "food", "dhaba", "biryani", "pizza", "sweets", "catering", "tea", "coffee", "dine", "dining", "menu", "thali", "burger", "cake", "cakes"],
  rings: ["gym", "fitness", "yoga", "crossfit", "workout", "martial", "dance", "sports", "zumba", "pilates", "boxing", "trainer", "athlete", "swimming", "karate"],
  constellation: ["school", "coaching", "academy", "institute", "tuition", "classes", "college", "education", "training", "learn", "learning", "students", "courses", "exam", "neet", "jee", "upsc", "ielts"],
  grid: ["software", "digital", "tech", "technology", "app", "web design", "website", "marketing", "agency", "startup", "electronics", "computer", "laptop", "mobile repair", "gaming", "it services", "seo", "cctv"],
  globe: ["travel", "tour", "tours", "visa", "immigration", "logistics", "courier", "export", "import", "shipping", "airline", "holiday", "holidays", "packers", "movers", "overseas", "study abroad"],
  flow: ["consultant", "consultancy", "chartered accountant", "ca firm", "lawyer", "advocate", "real estate", "property", "insurance", "finance", "services", "repair", "cleaning"],
};
const TYPE_DEFAULT = { clinic: "helix", salon: "bokeh", fitness: "rings", restaurant: "embers", education: "constellation", retail: "crystal", services: "flow" };
const TYPE_LABEL = { clinic: "a clinic", salon: "a salon", fitness: "a fitness studio", restaurant: "a restaurant", education: "an institute", retail: "a store", services: "a service business" };

const esc = (w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function sceneMeta(key) {
  return SCENES.find((s) => s.key === key) ?? SCENES[0];
}

/** Picks the 3D design that fits this business best, and says why. */
export function pickScene(k) {
  const text = [
    k.name,
    k.description,
    ...(k.services ?? []),
    ...(k.prices ?? []).map((p) => p.name),
    k.content?.headline,
    k.content?.subheadline,
    ...(k.content?.about ?? []),
    (k.text ?? "").slice(0, 6000),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const type = k.businessType ?? "services";
  let best = { key: TYPE_DEFAULT[type] ?? "flow", score: 0, hits: [] };
  for (const [key, words] of Object.entries(RULES)) {
    const hits = words.filter((w) => new RegExp(`(^|[^a-z])${esc(w)}([^a-z]|$)`).test(text));
    const score = hits.length + (TYPE_DEFAULT[type] === key ? 2 : 0);
    if (score > best.score) best = { key, score, hits };
  }
  const meta = sceneMeta(best.key);
  const reason = best.hits.length
    ? `your website talks about ${best.hits
        .slice(0, 3)
        .map((h) => `“${h}”`)
        .join(", ")}`
    : `it suits ${TYPE_LABEL[type] ?? "your business"}`;
  return { key: meta.key, name: meta.name, blurb: meta.blurb, reason };
}
