import "server-only";
import * as cheerio from "cheerio";
import { PLACE_NAMES } from "./regions";
import { renderPage } from "./render";

export interface SearchResult {
  title: string;
  url: string;
  host: string;
  snippet: string;
  kind: "website" | "instagram" | "directory" | "social";
  best?: boolean;
}

const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36";

const DIRECTORIES =
  /justdial|practo|lybrate|sulekha|magicpin|zomato|swiggy|tripadvisor|yelp|indiamart|urbanpro|shiksha|collegedunia|clinicspots|credihealth|google\.[a-z.]+\/maps|wikipedia|glassdoor|ambitionbox|linkedin|youtube|quora|reddit|nearbuy|dineout|eazydiner|weddingwire|wedmegood|weddingplz|venuelook|themakeoverz|fresha\.com|booksy|purplle|nykaa|urbanclap|urbancompany|housejoy|studydekho|holidify|restaurant-guru|wheree|sloshout|partykaro|grotal|asklaila|yellowpages|hotfrog|cybo|mapquest|waze|gurunearme|indiacatalog|academycheck|bharatibiz|bharatbz|topcoaching|edugorilla|consumersfeedback|oureducation|mappls|plumint|cghshospitals|weddingwire|zaubacorp|tofler|crunchbase|pinterest|medium\.com|blogspot|wordpress\.com\/?$|lokalhost|dialmenow|justlocal|near\.me|findhealthclinics|bizdir|tradeindia|exportersindia|clickindia|olx|quikr/i;

function classify(url: URL): SearchResult["kind"] {
  const h = url.hostname.replace(/^www\./, "");
  if (h === "instagram.com" && /^\/[A-Za-z0-9._]+\/?$/.test(url.pathname) && !/^\/(p|reel|explore|accounts|stories)\//.test(url.pathname)) return "instagram";
  if (/(^|\.)(facebook|fb|x|twitter|threads)\.com$/.test(h) || h === "instagram.com") return "social";
  if (DIRECTORIES.test(url.href)) return "directory";
  return "website";
}

function toResult(title: string, href: string, snippet: string): SearchResult | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return { title: title.trim().slice(0, 120), url: url.toString(), host: url.hostname.replace(/^www\./, ""), snippet: snippet.trim().slice(0, 220), kind: classify(url) };
  } catch {
    return null;
  }
}

async function duckduckgo(q: string): Promise<SearchResult[]> {
  const res = await fetch(`https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(q)}&kl=in-en`, {
    headers: { "user-agent": UA, accept: "text/html" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  const out: SearchResult[] = [];
  $("a.result-link").each((_, a) => {
    const raw = $(a).attr("href") ?? "";
    let href = raw;
    try {
      const u = new URL(raw, "https://duckduckgo.com");
      href = u.searchParams.get("uddg") ?? u.toString();
    } catch {
      return;
    }
    const snippet = $(a).closest("tr").nextAll("tr").first().find(".result-snippet").text();
    const r = toResult($(a).text(), href, snippet);
    if (r && !/duckduckgo\.com/.test(r.host)) out.push(r);
  });
  return out;
}

/** Google results via Serper.dev (free: 2,500 searches, no card). Works from cloud servers, unlike the free engines. */
async function serper(q: string): Promise<SearchResult[] | null> {
  const key = process.env.SERPER_API_KEY;
  if (!key) return null;
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "x-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ q, gl: "in", hl: "en", num: 15 }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = (await res.json()) as { organic?: { title: string; link: string; snippet?: string }[] };
  return (d.organic ?? []).map((r) => toResult(r.title, r.link, r.snippet ?? "")).filter((r): r is SearchResult => r !== null);
}

async function braveApi(q: string): Promise<SearchResult[] | null> {
  const key = process.env.BRAVE_SEARCH_API_KEY;
  if (!key) return null;
  const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&country=in&count=15`, {
    headers: { accept: "application/json", "x-subscription-token": key },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const d = (await res.json()) as { web?: { results?: { title: string; url: string; description?: string }[] } };
  return (d.web?.results ?? []).map((r) => toResult(r.title, r.url, (r.description ?? "").replace(/<[^>]+>/g, ""))).filter((r): r is SearchResult => r !== null);
}

async function brave(q: string): Promise<SearchResult[]> {
  const res = await fetch(`https://search.brave.com/search?q=${encodeURIComponent(q)}`, {
    headers: { "user-agent": UA, accept: "text/html", "accept-language": "en-IN,en;q=0.9" },
    signal: AbortSignal.timeout(8_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const $ = cheerio.load(await res.text());
  const out: SearchResult[] = [];
  $('[data-type="web"]').each((_, el) => {
    const e = $(el);
    const href = e.find("a[href^='http']").first().attr("href") ?? "";
    const title = e.find(".title, .snippet-title, [class*=title]").first().text();
    const desc = e.find(".snippet-description, [class*=description], .content").first().text();
    const r = toResult(title, href, desc);
    if (r && !/brave\.com$/.test(r.host)) out.push(r);
  });
  return out;
}

async function duckduckgoBrowser(q: string): Promise<SearchResult[]> {
  const page = await renderPage(`https://duckduckgo.com/?q=${encodeURIComponent(q)}&kl=in-en&ia=web`, 15_000);
  if (!page) return [];
  const $ = cheerio.load(page.html);
  const out: SearchResult[] = [];
  $('article[data-testid="result"]').each((_, el) => {
    const a = $(el).find('a[data-testid="result-title-a"]').first();
    const r = toResult(a.text(), a.attr("href") ?? "", $(el).find('[data-result="snippet"]').first().text());
    if (r && !/duckduckgo\.com/.test(r.host)) out.push(r);
  });
  return out;
}

/**
 * Try engines in order until one answers. Keyed APIs first (they work from any server),
 * then the free engines, which rate-limit and often block cloud IPs.
 * `answered` is false only when no engine could be reached, so "nothing found" is never claimed falsely.
 */
export async function webSearchDetailed(q: string): Promise<{ results: SearchResult[]; answered: boolean }> {
  // A real browser is too slow for a serverless time limit, and cloud IPs get a captcha anyway.
  const engines: [string, (q: string) => Promise<SearchResult[] | null>][] = [
    ["serper", serper],
    ["brave-api", braveApi],
    ["brave", brave],
    ["duckduckgo", duckduckgo],
    ...(process.env.VERCEL ? [] : ([["duckduckgo-browser", duckduckgoBrowser]] as [string, (q: string) => Promise<SearchResult[]>][])),
  ];
  let answered = false;
  let best: SearchResult[] = [];
  for (const [name, engine] of engines) {
    try {
      const r = await engine(q);
      if (r === null) continue; // not configured
      answered = true;
      if (r.length >= 2) return { results: r, answered };
      if (r.length > best.length) best = r;
    } catch (e) {
      console.warn(`[search] ${name} failed: ${e instanceof Error ? e.message : e}`);
    }
  }
  return { results: best, answered };
}

export async function webSearch(q: string): Promise<SearchResult[]> {
  return (await webSearchDetailed(q)).results;
}

const cache = ((globalThis as unknown as { __fsSearch?: Map<string, { at: number; results: SearchResult[] }> }).__fsSearch ??= new Map());
const TTL = 6 * 60 * 60_000;

// City names don't identify a business ("Apollo Dental Mumbai"), so they're ignored when judging relevance.
const GENERIC_Q = new Set([...PLACE_NAMES.flatMap((n) => n.split(" ")), "the", "and", "for", "salon", "clinic", "unisex", "beauty", "dental", "delhi", "new", "india", "near", "best", "shop", "store", "cafe", "restaurant", "centre", "center", "studio", "classes", "institute", "academy", "parlour", "hospital", "gym", "sector", "road", "market"]);

function relevant(q: string, results: SearchResult[]) {
  const words = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !GENERIC_Q.has(w));
  if (!words.length) return results;
  const hits = results.filter((r) => {
    const hay = `${r.title} ${r.host} ${r.url} ${r.snippet}`.toLowerCase();
    return words.some((w) => hay.includes(w));
  });
  return hits.length ? hits : results;
}

/** Find a business's website or Instagram from its name. */
export async function searchBusiness(q: string): Promise<{ results: SearchResult[]; answered: boolean }> {
  const key = q.toLowerCase().replace(/\s+/g, " ").trim();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return { results: hit.results, answered: true };

  const first = await webSearchDetailed(q);
  if (!first.answered) return first;
  let results = first.results;
  // Small businesses often have no website, so look for an Instagram profile explicitly too.
  if (results.length && !results.some((r) => r.kind === "instagram")) {
    const ig = await webSearch(`${q} instagram`);
    results.push(...ig.filter((r) => r.kind === "instagram"));
  }
  results = relevant(q, results);

  const seen = new Set<string>();
  const unique = results.filter((r) => {
    const key = r.kind === "instagram" ? r.url.toLowerCase().replace(/\/$/, "") : r.host;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // The business's own site usually has its name in the domain ("northdelhidentalclinic.com").
  const squashed = q.toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter((w) => w.length >= 3 && !GENERIC_Q.has(w));
  const nameScore = (r: SearchResult) => {
    const target = r.kind === "instagram" ? r.url.toLowerCase() : r.host.replace(/[^a-z0-9]/g, "");
    return squashed.filter((w) => target.includes(w)).length;
  };
  const rank = { website: 0, instagram: 1, social: 2, directory: 3 } as const;
  const sorted = unique.sort((a, b) => rank[a.kind] - rank[b.kind] || nameScore(b) - nameScore(a));
  const top = sorted.find((r) => (r.kind === "website" || r.kind === "instagram") && nameScore(r) > 0);
  if (top) {
    top.best = true;
    sorted.splice(sorted.indexOf(top), 1);
    sorted.unshift(top);
  }
  const final = sorted.slice(0, 10);
  if (final.length) {
    cache.set(key, { at: Date.now(), results: final });
    if (cache.size > 300) cache.delete(cache.keys().next().value!);
  }
  return { results: final, answered: true };
}
