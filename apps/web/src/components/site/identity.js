/**
 * A visual identity for one business's new website. Two salons should never look the same:
 *  - colour comes from the business's own brand colour when its site has one, otherwise from a palette picked for it;
 *  - fonts, corner style, casing, background tone and layout are picked from pools that suit its kind of business,
 *    seeded by the business itself so the same business always gets the same look.
 * Pure data and logic, safe on the server and in the browser.
 */
import { WORDS } from "./themes";

/* ------------------------------------------------------------------ fonts */
// `theme` keeps the few theme-specific CSS tweaks (e.g. the extra-large condensed hero title) working.
const FONTS = {
  maison: { display: "Cormorant Garamond", displayWeights: "500;600;700", displayItalic: true, body: "Manrope", theme: "maison" },
  playfair: { display: "Playfair Display", displayWeights: "500;600;700", displayItalic: true, body: "DM Sans", theme: "table" },
  fraunces: { display: "Fraunces", displayWeights: "500;600;700", displayItalic: true, body: "Inter", theme: "clarity" },
  dmserif: { display: "DM Serif Display", displayWeights: "400", displayItalic: true, body: "DM Sans", theme: "scholar" },
  anton: { display: "Anton", displayWeights: "400", displayItalic: false, body: "Inter", theme: "pulse", upper: true },
  space: { display: "Space Grotesk", displayWeights: "500;600;700", displayItalic: false, body: "Inter", theme: "atelier" },
  sora: { display: "Sora", displayWeights: "500;600;700", displayItalic: false, body: "Inter", theme: "studio" },
  syne: { display: "Syne", displayWeights: "600;700;800", displayItalic: false, body: "Manrope", theme: "syne" },
  lora: { display: "Lora", displayWeights: "500;600;700", displayItalic: true, body: "Nunito Sans", theme: "lora" },
  baskerville: { display: "Libre Baskerville", displayWeights: "400;700", displayItalic: true, body: "Karla", theme: "baskerville" },
  unbounded: { display: "Unbounded", displayWeights: "500;600;700", displayItalic: false, body: "Figtree", theme: "unbounded" },
  outfit: { display: "Outfit", displayWeights: "500;600;700", displayItalic: false, body: "Nunito Sans", theme: "outfit" },
  marcellus: { display: "Marcellus", displayWeights: "400", displayItalic: false, body: "Jost", theme: "marcellus" },
  archivo: { display: "Archivo", displayWeights: "600;700;800", displayItalic: false, body: "Work Sans", theme: "archivo" },
};

/* ------------------------------------------------ what suits each kind of business */
const POOLS = {
  salon: {
    fonts: ["maison", "playfair", "dmserif", "lora", "marcellus", "syne"],
    accents: ["#9d174d", "#a8804a", "#7c3aed", "#be185d", "#b45309", "#0f766e"],
  },
  clinic: {
    fonts: ["fraunces", "sora", "outfit", "lora", "space"],
    accents: ["#0f766e", "#0369a1", "#1d4ed8", "#047857", "#4f46e5"],
  },
  restaurant: {
    fonts: ["playfair", "dmserif", "baskerville", "syne", "archivo", "fraunces"],
    accents: ["#b9502c", "#b45309", "#9f1239", "#15803d", "#a16207", "#c2410c"],
  },
  education: {
    fonts: ["dmserif", "baskerville", "fraunces", "outfit", "sora", "unbounded"],
    accents: ["#1e40af", "#c7901c", "#15803d", "#7c2d12", "#4338ca", "#0e7490"],
  },
  fitness: {
    fonts: ["anton", "unbounded", "archivo", "syne", "space"],
    accents: ["#d8472a", "#dc2626", "#65a30d", "#ea580c", "#2563eb"],
  },
  retail: {
    fonts: ["space", "playfair", "syne", "marcellus", "outfit", "archivo"],
    accents: ["#2f5d50", "#9d174d", "#1d4ed8", "#a16207", "#6d28d9", "#0f766e"],
  },
  services: {
    fonts: ["sora", "space", "outfit", "fraunces", "archivo", "lora"],
    accents: ["#3450c9", "#0f766e", "#7c3aed", "#b45309", "#0369a1", "#be123c"],
  },
};

// Fonts every computer has (Georgia, Times…) say nothing about the brand, so they don't override the pick.
const SYSTEM_FONTS = /^(georgia|palatino|palatino linotype|garamond|times|times new roman|book antiqua|baskerville|arial|helvetica|verdana|tahoma)$/i;
const RADII = ["0px", "4px", "10px", "18px", "28px"];
// How the page background relates to the brand colour.
const TONES = ["paper", "tinted", "cool", "warm"];
const HERO = ["split", "center", "left"];
const CARDS = ["ruled", "raised", "outline"];

/* ------------------------------------------------------------ colour maths */
function hexToRgb(hex) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.replace(/./g, "$&$&") : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHsl([r, g, b]) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l * 100];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s * 100, l * 100];
}
function hsl(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));
  return `#${[f(0), f(8), f(4)].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}
function lum(hex) {
  const c = hexToRgb(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
};
/** Darken an accent until it reads on a light page and carries white text. */
function readable(accent) {
  let [h, s, l] = rgbToHsl(hexToRgb(accent));
  let c = hsl(h, s, l);
  for (let i = 0; i < 20 && contrast(c, "#ffffff") < 4.5; i++) c = hsl(h, s, (l -= 3));
  return c;
}

/* ---------------------------------------------------------------- picking */
function seedOf(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 16777619);
  return h >>> 0;
}
const pick = (arr, seed, salt) => arr[seedOf(`${seed}:${salt}`) % arr.length];

const MOODS = {
  salon: ["Look good. Feel better.", "Walk in. Glow out.", "Your hour of calm.", "Made for your best days."],
  clinic: ["Care, explained clearly.", "Unhurried care, close to home.", "Your health, in steady hands.", "Clear answers. Gentle care."],
  restaurant: ["Pull up a chair.", "Come hungry.", "Food worth the trip.", "Good food, made fresh."],
  education: ["Learning that goes somewhere.", "Where curiosity grows.", "Every learner, known by name.", "Strong basics. Bright futures."],
  school: ["Where every child is known.", "Rooted in values. Ready for tomorrow.", "A school that feels like home.", "Learning, with care."],
  fitness: ["Show up. We'll handle the rest.", "Stronger every week.", "Train with people who care.", "Your fittest year starts here."],
  retail: ["Come and have a look.", "Picked with care.", "Quality you can hold.", "Worth the visit."],
  services: ["Tell us what you need.", "Done right, the first time.", "Reliable. Local. Ready.", "We'll take it from here."],
};
const OFFER_TITLES = {
  salon: ["The service menu", "Treatments & prices", "What we do best"],
  clinic: ["Treatments & fees", "How we can help", "Our care"],
  restaurant: ["The menu", "From our kitchen", "What's cooking"],
  education: ["Courses & fees", "Programs", "What you'll learn"],
  school: ["Classes, admissions & fees", "Academics", "Learning at our school"],
  fitness: ["Programs & memberships", "Ways to train", "Plans"],
  retail: ["Products & prices", "In store", "Our range"],
  services: ["Services & prices", "What we do", "How we help"],
};

/**
 * Build the identity for one business.
 * @param {object} k      the business knowledge
 * @param {object} brand  siteBrand() output: accent from the real site, fonts found on it
 * @param {string} key    profile key (salon, school, ...)
 */
export function identityFor(k, brand, key) {
  const type = POOLS[k.businessType] ? k.businessType : "services";
  const pool = POOLS[type];
  const seed = `${k.name}|${new URL(k.url || "https://x.in").hostname}`;

  const fontKey = pick(pool.fonts, seed, "font");
  const font = { ...FONTS[fontKey] };
  // The business's own heading font, when we could read one, wins: it's part of their brand.
  if (brand?.headingFont && !SYSTEM_FONTS.test(brand.headingFont)) {
    font.display = brand.headingFont;
    font.displayWeights = "400;500;600;700";
    font.displayItalic = false;
  }

  const accent = readable(brand?.fromBrand && brand.accent ? brand.accent : pick(pool.accents, seed, "accent"));
  const [h, s] = rgbToHsl(hexToRgb(accent));
  const tone = pick(TONES, seed, "tone");
  const sat = Math.min(s, 60);
  const bgs = {
    paper: [hsl(h, Math.min(sat, 18), 96.5), hsl(h, Math.min(sat, 20), 99.4)],
    tinted: [hsl(h, Math.min(sat, 45), 94.5), hsl(h, Math.min(sat, 40), 98.6)],
    cool: [hsl(220, 20, 97), "#ffffff"],
    warm: [hsl(38, 35, 95.5), hsl(40, 40, 99)],
  }[tone];

  const words = WORDS[key === "school" ? "school" : type] ?? WORDS.services;
  return {
    theme: {
      name: font.theme,
      bg: bgs[0],
      surface: bgs[1],
      ink: hsl(h, Math.min(sat, 30), 10),
      muted: hsl(h, Math.min(sat, 14), 38),
      line: hsl(h, Math.min(sat, 20), 86),
      accent,
      accentInk: "#ffffff",
      dark: hsl(h, Math.min(sat, 40), 8),
      darkInk: hsl(h, Math.min(sat, 25), 95),
      display: font.display,
      displayWeights: font.displayWeights,
      displayItalic: font.displayItalic,
      body: font.body,
      radius: font.upper ? pick(["0px", "4px"], seed, "radius") : pick(RADII, seed, "radius"),
      upper: Boolean(font.upper) || (!font.displayItalic && seedOf(`${seed}:case`) % 5 === 0),
      tracking: font.upper ? "0.01em" : font.displayItalic ? "-0.01em" : "-0.025em",
      hero: pick(HERO, seed, "hero"),
      cards: pick(CARDS, seed, "cards"),
      tone,
    },
    words: {
      ...words,
      mood: pick(MOODS[key === "school" ? "school" : type] ?? MOODS.services, seed, "mood"),
      offerTitle: pick(OFFER_TITLES[key === "school" ? "school" : type] ?? OFFER_TITLES.services, seed, "offer"),
    },
  };
}
