/**
 * The 42 3D designs a redesigned website can open with, and how Weblyy picks one:
 * it reads the business's own words (name, services, prices, about text, the site's text)
 * and scores each design by the words that fit it, with a nudge from the detected business type.
 * Pure data and logic, safe on the server and in the browser.
 */
import { MORE_SCENE_META } from "@/components/site/hero-3d-more";

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
  ...MORE_SCENE_META,
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
  galaxy: ["astrology", "planetarium", "space", "science", "physics", "observatory"],
  warp: ["internet", "broadband", "fiber", "speed", "fast delivery", "express"],
  starfield: ["film", "cinema", "media", "studio", "production", "animation"],
  knot: ["yoga", "meditation", "wellness", "therapy", "counselling", "counseling"],
  sphere: ["globe", "international", "world", "global", "360"],
  ripple: ["water", "pool", "swimming", "aqua", "purifier", "ro service", "laundry"],
  aurora: ["resort", "hotel", "homestay", "retreat", "hills", "kashmir", "houseboat"],
  rain: ["umbrella", "waterproofing", "monsoon", "roofing"],
  snow: ["ice cream", "gelato", "dessert", "frozen", "ski", "gulmarg"],
  fireflies: ["candle", "lights", "lighting", "decorative lights", "diya", "lamp"],
  fountain: ["juice", "drinks", "beverages", "shake", "soda", "fountain"],
  tornado: ["cleaning", "vacuum", "car wash", "detailing", "pest control"],
  petals: ["florist", "flowers", "garden", "nursery plants", "spa", "henna", "mehndi"],
  infinity: ["insurance", "loan", "finance", "investment", "wealth", "mutual fund"],
  atom: ["lab", "laboratory", "pathology", "diagnostic", "chemistry", "research", "science"],
  hexgrid: ["honey", "construction", "architecture", "engineering", "tiles", "flooring"],
  skyline: ["real estate", "property", "builder", "apartments", "flats", "realty", "construction"],
  equalizer: ["music", "dj", "sound", "studio", "guitar", "singing", "radio", "karaoke"],
  terrain: ["trek", "trekking", "adventure", "camping", "hiking", "tour", "travel"],
  dunes: ["desert", "rajasthan", "safari", "camel", "sand"],
  lattice: ["hardware", "steel", "fabrication", "manufacturing", "industrial", "machinery"],
  bubbles: ["soap", "laundry", "dry clean", "spa", "aquarium", "fish", "baby"],
  confetti: ["party", "events", "birthday", "celebration", "wedding planner", "balloon", "decorations"],
  sunburst: ["solar", "energy", "electrical", "electrician", "power", "inverter"],
  mandala: ["temple", "puja", "spiritual", "handicraft", "art", "rangoli", "ayurveda"],
  stairs: ["career", "consultancy", "coaching", "growth", "promotion", "skills"],
  spire: ["church", "christmas", "gifts", "festive", "tree"],
  leaves: ["organic", "herbal", "tea", "green", "plants", "ayurvedic", "natural"],
  heartbeat: ["cardio", "cardiology", "heart", "hospital", "ambulance", "emergency", "nursing"],
  orbits: ["school", "planet", "kids", "montessori", "play school", "preschool"],
  ribbon: ["gift", "packaging", "printing", "ribbon", "stationery", "textile"],
  vortex: ["gaming", "arcade", "esports", "vr", "trampoline", "fun zone"],
};

/** Designs that suit each kind of business when its words don't point to one in particular. */
const TYPE_POOL = {
  clinic: ["helix", "heartbeat", "atom", "sphere", "ripple", "knot"],
  salon: ["bokeh", "petals", "silk", "bubbles", "fireflies", "mandala"],
  fitness: ["rings", "equalizer", "vortex", "tornado", "warp", "terrain"],
  restaurant: ["embers", "fountain", "snow", "fireflies", "leaves", "confetti"],
  education: ["constellation", "orbits", "galaxy", "stairs", "lattice", "starfield"],
  retail: ["crystal", "ribbon", "silk", "sphere", "confetti", "knot"],
  services: ["flow", "infinity", "hexgrid", "skyline", "sunburst", "aurora", "dunes", "grid", "globe"],
};
function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
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
  const pool = TYPE_POOL[type] ?? TYPE_POOL.services;
  const seed = seedOf(`${k.name}|${k.url}`);
  // With no specific words, businesses of the same kind still get different designs from their kind's pool.
  let best = { key: pool[seed % pool.length], score: 0, hits: [] };
  const tied = [];
  for (const [key, words] of Object.entries(RULES)) {
    const hits = words.filter((w) => new RegExp(`(^|[^a-z])${esc(w)}([^a-z]|$)`).test(text));
    if (!hits.length) continue;
    const score = hits.length + (pool.includes(key) ? 1 : 0);
    if (score > best.score) {
      best = { key, score, hits };
      tied.length = 0;
      tied.push(best);
    } else if (score === best.score) tied.push({ key, score, hits });
  }
  if (tied.length > 1) best = tied[seed % tied.length];
  const meta = sceneMeta(best.key);
  const reason = best.hits.length
    ? `your website talks about ${best.hits
        .slice(0, 3)
        .map((h) => `“${h}”`)
        .join(", ")}`
    : `it suits ${TYPE_LABEL[type] ?? "your business"}`;
  return { key: meta.key, name: meta.name, blurb: meta.blurb, reason };
}
