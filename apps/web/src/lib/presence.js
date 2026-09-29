import "server-only";
import { detectPlace } from "./regions";
import { webSearch } from "./search";
const PLATFORMS = [
  [/google\.[a-z.]+\/maps|maps\.app\.goo\.gl|g\.page|business\.site/, "Google Maps"],
  [/justdial\./, "Justdial"],
  [/practo\./, "Practo"],
  [/lybrate\./, "Lybrate"],
  [/sulekha\./, "Sulekha"],
  [/magicpin\./, "magicpin"],
  [/zomato\./, "Zomato"],
  [/swiggy\./, "Swiggy"],
  [/tripadvisor\./, "Tripadvisor"],
  [/urbancompany\.|urbanclap\./, "Urban Company"],
  [/fresha\./, "Fresha"],
  [/booksy\./, "Booksy"],
  [/wedmegood\./, "WedMeGood"],
  [/indiamart\./, "IndiaMART"],
  [/urbanpro\./, "UrbanPro"],
  [/shiksha\./, "Shiksha"],
  [/instagram\./, "Instagram"],
  [/facebook\.|fb\.com/, "Facebook"],
  [/youtube\./, "YouTube"],
  [/linkedin\./, "LinkedIn"],
  [/(^|\.)(x|twitter)\.com/, "X"],
  [/wikipedia\.org/, "Wikipedia"],
  [/reddit\.com/, "Reddit"],
  [/quora\.com/, "Quora"],
  [/nearbuy\./, "nearbuy"],
  [/dineout\./, "Dineout"],
  [/eazydiner\./, "EazyDiner"],
];
/** Employer-review and job sites rate the business as a workplace, not for customers. */
const SKIP = /glassdoor|ambitionbox|naukri|indeed\.|linkedin\.com\/jobs|zaubacorp|tofler/;
const CITIES =
  /\b(new delhi|delhi|gurugram|gurgaon|noida|greater noida|ghaziabad|faridabad|mumbai|navi mumbai|thane|jammu|srinagar|anantnag|baramulla|katra|udhampur|kathua|pune|bengaluru|bangalore|hyderabad|chennai|kolkata|ahmedabad|jaipur|lucknow|chandigarh|mohali|indore|bhopal|surat|nagpur|kochi|dehradun|patna|kanpur|agra|varanasi)\b/i;
const GENERIC = new Set([
  "the",
  "and",
  "for",
  "salon",
  "clinic",
  "unisex",
  "beauty",
  "dental",
  "studio",
  "centre",
  "center",
  "academy",
  "institute",
  "classes",
  "cafe",
  "restaurant",
  "shop",
  "store",
  "hospital",
  "parlour",
  "spa",
  "gym",
  "pvt",
  "ltd",
  "private",
  "limited",
]);
function platformOf(r) {
  for (const [re, name] of PLATFORMS) if (re.test(r.url)) return name;
  if (r.kind !== "directory") return null;
  const parts = r.host.split(".");
  const base = parts.length > 2 && /^(co|com|org|net)$/.test(parts[parts.length - 2]) ? parts[parts.length - 3] : parts[parts.length - 2];
  return base ? base[0].toUpperCase() + base.slice(1) : r.host;
}
function ratingOf(text) {
  const r = text.match(/\b([1-5](?:\.\d)?)\s*(?:\/\s*5|★|stars?\b|out of 5|rating)/i) ?? text.match(/(?:rated|rating:?)\s*([1-5](?:\.\d)?)\b/i);
  const n = text.match(/\b(\d{1,3}(?:,\d{3})*|\d+)\+?\s*(?:reviews|ratings|votes)\b/i);
  const rating = r ? Number(r[1]) : undefined;
  const reviews = n ? Number(n[1].replace(/,/g, "")) : undefined;
  return { rating: rating && rating <= 5 ? rating : undefined, reviews };
}
const normHost = (h) => h.toLowerCase().replace(/^www\./, "");
/** Search the web for the business by name and see where else it shows up: maps, directories, social, reviews. */
export async function findWebPresence(k, log) {
  const name = k.name.trim();
  if (!name || /\.demo$/.test(new URL(k.url).hostname)) return null;
  const city = detectPlace(k.address)?.city || (k.address.match(CITIES)?.[1] ?? "");
  const query = `${name}${city ? ` ${city}` : ""}`;
  log(`Searching the web for “${query}”`);
  const [main, reviews] = await Promise.all([webSearch(query).catch(() => []), webSearch(`${query} reviews`).catch(() => [])]);
  const all = [...main, ...reviews];
  if (!all.length) return { query, searched: false, ownSiteFound: false, listings: [], mentions: 0 };
  // Only keep results that are about this business: they must share a distinctive word with its name.
  const words = name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 3 && !GENERIC.has(w));
  const about = (r) => !words.length || words.some((w) => `${r.title} ${r.url} ${r.snippet}`.toLowerCase().includes(w));
  const relevant = all.filter(about);
  const siteHost = normHost(new URL(k.url).hostname);
  const igHandle = k.instagram?.handle?.toLowerCase().replace(/^@/, "");
  const ownSiteFound = main.some((r) => normHost(r.host) === siteHost || (igHandle ? r.url.toLowerCase().includes(`instagram.com/${igHandle}`) : false));
  const byPlatform = new Map();
  for (const r of relevant) {
    if (normHost(r.host) === siteHost || SKIP.test(r.url)) continue;
    const platform = platformOf(r);
    if (!platform) continue;
    const { rating, reviews: count } = ratingOf(`${r.title} ${r.snippet}`);
    const prev = byPlatform.get(platform);
    if (!prev) byPlatform.set(platform, { platform, url: r.url, title: r.title, rating, reviews: count });
    else if (!prev.rating && rating) Object.assign(prev, { rating, reviews: count ?? prev.reviews });
  }
  const listings = [...byPlatform.values()].slice(0, 12);
  const mentions = new Set(relevant.map((r) => r.url)).size;
  return { query, searched: true, ownSiteFound, listings, mentions };
}
