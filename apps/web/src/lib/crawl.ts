import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import type { BusinessType, FaqItem, FormInfo, PriceItem, SiteKnowledge } from "./types";

const MAX_BYTES = 2_500_000;
const MAX_EXTRA_PAGES = 5;
const FETCH_TIMEOUT_MS = 10_000;
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 FlowScout/1.0";

export const DEMO_URL = "https://kesar-beauty.demo/";
const DEMO_HOST = "kesar-beauty.demo";

export class CrawlError extends Error {}

type Log = (level: "info" | "ok" | "warn", text: string) => void;

/* ---------------------------------------------------------------- URL safety */

export function normalizeUrl(input: string): URL {
  let raw = input.trim();
  if (!raw) throw new CrawlError("Please enter a website address.");
  if (raw.toLowerCase() === "demo") return new URL(DEMO_URL);
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new CrawlError("That doesn't look like a website address.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new CrawlError("Only http and https websites can be scanned.");
  }
  if (!url.hostname.includes(".")) throw new CrawlError("That doesn't look like a website address.");
  url.hash = "";
  return url;
}

function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateIp(v6.slice(7));
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

async function assertPublicHost(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new CrawlError("Local and private addresses can't be scanned.");
  }
  let addrs: { address: string }[];
  try {
    addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true });
  } catch {
    throw new CrawlError(`Couldn't find ${host}. Check the spelling?`);
  }
  if (addrs.length === 0 || addrs.some((a) => isPrivateIp(a.address))) {
    throw new CrawlError("Local and private addresses can't be scanned.");
  }
}

/* ------------------------------------------------------------------ fetching */

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

async function fetchDemoPage(url: URL): Promise<{ url: URL; html: string }> {
  const slug = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "") || "index";
  if (!/^[a-z-]+$/.test(slug)) throw new CrawlError("Page not found");
  const file = path.join(process.cwd(), "public", "demo", "kesar", `${slug}.html`);
  const html = await readFile(file, "utf8").catch(() => {
    throw new CrawlError("Page not found");
  });
  return { url, html };
}

async function fetchPage(start: URL): Promise<{ url: URL; html: string }> {
  if (start.hostname === DEMO_HOST) return fetchDemoPage(start);
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicHost(url.hostname);
    let res: Response;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      });
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      throw new CrawlError(timedOut ? `${url.hostname} took too long to respond.` : `Couldn't reach ${url.hostname}.`);
    }
    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get("location");
      await res.body?.cancel();
      if (!loc) throw new CrawlError("The site redirected without a destination.");
      url = new URL(loc, url);
      if (url.protocol !== "http:" && url.protocol !== "https:") throw new CrawlError("Unsupported redirect.");
      continue;
    }
    if (!res.ok) {
      await res.body?.cancel();
      throw new CrawlError(`${url.hostname} answered with error ${res.status}.`);
    }
    const type = res.headers.get("content-type") ?? "";
    if (type && !type.includes("html")) {
      await res.body?.cancel();
      throw new CrawlError("That address isn't a web page.");
    }
    return { url, html: await readCapped(res) };
  }
  throw new CrawlError("Too many redirects.");
}

/* ---------------------------------------------------------------- extraction */

const EMBEDS: [RegExp, string][] = [
  [/calendly\.com/i, "Calendly booking"],
  [/fresha\.com/i, "Fresha booking"],
  [/setmore\.com/i, "Setmore booking"],
  [/simplybook\./i, "SimplyBook booking"],
  [/zohobookings|bookings\.zoho/i, "Zoho Bookings"],
  [/squareup\.com\/appointments|square\.site/i, "Square Appointments"],
  [/practo\.com/i, "Practo booking"],
  [/docs\.google\.com\/forms|forms\.gle/i, "Google Form"],
  [/typeform\.com/i, "Typeform"],
  [/tawk\.to/i, "Tawk.to live chat"],
  [/crisp\.chat/i, "Crisp live chat"],
  [/intercom/i, "Intercom chat"],
  [/tidio/i, "Tidio chat"],
  [/zdassets|zendesk/i, "Zendesk chat"],
  [/hs-scripts|hubspot/i, "HubSpot forms"],
  [/wati\.io/i, "WATI WhatsApp widget"],
  [/interakt/i, "Interakt WhatsApp widget"],
  [/gallabox/i, "Gallabox WhatsApp widget"],
  [/elfsight/i, "Elfsight widget"],
  [/google\.com\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/i, "Google Maps"],
  [/razorpay/i, "Razorpay payments"],
  [/instamojo/i, "Instamojo payments"],
  [/cdn\.shopify|myshopify/i, "Shopify store"],
  [/zomato|swiggy/i, "Food delivery listing"],
];

const SOCIALS: [RegExp, string][] = [
  [/instagram\.com/i, "Instagram"],
  [/facebook\.com|fb\.me/i, "Facebook"],
  [/linkedin\.com/i, "LinkedIn"],
  [/youtube\.com|youtu\.be/i, "YouTube"],
  [/(twitter|x)\.com\//i, "X / Twitter"],
];

const PRICE_RE = /(?:₹|rs\.?|inr|\$|£|€)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:-|–|to)\s?(?:₹|rs\.?)?\s?\d[\d,]*)?\s?\+?|\d[\d,]{1,7}\s?(?:\/-|rs\b|inr\b)/i;
const JUNK_PRICE_NAME =
  /^(?:the\s+)?(?:regular|sale|unit|original|final|special|offer|discounted|highest|lowest|total|sub-?total|starting|mrp|price|from|to|save|you save|was|now|only|per|each|incl\.?|excl\.?|tax|gst|shipping|delivery|off|\s|is|\d|%|:)+$/i;
const PHONE_RE = /(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const HOURS_RE =
  /\b(?:mon|tue|wed|thu|fri|sat|sun|daily|everyday|all days|open)[a-z]*\b[^\n]{0,70}?\d{1,2}(?::\d{2})?\s?(?:am|pm)[^\n]{0,30}?\d{1,2}(?::\d{2})?\s?(?:am|pm)/gi;

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

function digitsOnly(s: string) {
  return s.replace(/[^\d+]/g, "");
}

function whatsappNumber(href: string): string | null {
  try {
    const u = new URL(href);
    if (/wa\.me$/i.test(u.hostname)) return digitsOnly(u.pathname) || "WhatsApp link";
    if (/whatsapp\.com$/i.test(u.hostname)) return digitsOnly(u.searchParams.get("phone") ?? "") || "WhatsApp link";
  } catch {
    if (href.startsWith("whatsapp:")) return "WhatsApp link";
  }
  return null;
}

interface PageData {
  url: string;
  title: string;
  links: string[];
  internal: { href: string; text: string }[];
  whatsapp: string[];
  emails: string[];
  phones: string[];
  forms: FormInfo[];
  embeds: string[];
  socials: string[];
  prices: PriceItem[];
  faqs: FaqItem[];
  hours: string[];
  address: string;
  headings: string[];
  text: string;
  jsonLd: Record<string, unknown>[];
  siteName: string;
  description: string;
}

function fieldLabel($: cheerio.CheerioAPI, el: cheerio.Cheerio<never>): string {
  const id = el.attr("id");
  const label = id ? clean($(`label[for="${id}"]`).first().text()) : "";
  return label || el.attr("placeholder") || el.attr("aria-label") || el.attr("name") || "";
}

function formPurpose(text: string, fields: string[]): string {
  const t = `${text} ${fields.join(" ")}`.toLowerCase();
  if (/book|appointment|slot|reserv|schedule|date/.test(t)) return "booking";
  if (/newsletter|subscribe/.test(t)) return "newsletter";
  if (/admission|enrol|enroll|course|demo class/.test(t)) return "admission";
  if (/order|quantity|cart/.test(t)) return "order";
  return "enquiry";
}

function extractPage(url: URL, html: string): PageData {
  const $ = cheerio.load(html);
  const jsonLd: Record<string, unknown>[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const list = Array.isArray(data) ? data : data["@graph"] ?? [data];
      for (const item of list) if (item && typeof item === "object") jsonLd.push(item);
    } catch {
      /* malformed JSON-LD is common, skip it */
    }
  });

  const embeds = new Set<string>();
  const scriptBlob = $("script")
    .map((_, el) => `${$(el).attr("src") ?? ""} ${$(el).text().slice(0, 4000)}`)
    .get()
    .join(" ");
  const iframeBlob = $("iframe").map((_, el) => $(el).attr("src") ?? "").get().join(" ");

  const whatsapp = new Set<string>();
  const emails = new Set<string>();
  const phones = new Set<string>();
  const socials = new Set<string>();
  const links: string[] = [];
  const internal: { href: string; text: string }[] = [];

  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    const text = clean($(el).text());
    if (!href) return;
    links.push(href);
    const wa = whatsappNumber(href);
    if (wa) return void whatsapp.add(wa);
    if (href.startsWith("mailto:")) return void emails.add(href.slice(7).split("?")[0].toLowerCase());
    if (href.startsWith("tel:")) return void phones.add(digitsOnly(href.slice(4)));
    for (const [re, name] of SOCIALS) if (re.test(href)) socials.add(name);
    try {
      const abs = new URL(href, url);
      if (abs.hostname === url.hostname && (abs.protocol === "http:" || abs.protocol === "https:")) {
        abs.hash = "";
        internal.push({ href: abs.toString(), text });
      }
    } catch {
      /* ignore bad hrefs */
    }
  });

  const linkBlob = links.join(" ");
  for (const [re, name] of EMBEDS) if (re.test(scriptBlob) || re.test(iframeBlob) || re.test(linkBlob)) embeds.add(name);

  const forms: FormInfo[] = [];
  $("form").each((_, form) => {
    const f = $(form);
    const fields: string[] = [];
    f.find("input, select, textarea").each((_, input) => {
      const inp = $(input) as cheerio.Cheerio<never>;
      const type = (inp.attr("type") ?? "").toLowerCase();
      if (["hidden", "submit", "button", "image", "reset"].includes(type)) return;
      const label = clean(fieldLabel($, inp)).slice(0, 40);
      if (label) fields.push(label);
    });
    const ctx = clean(`${f.text()} ${f.attr("action") ?? ""} ${f.attr("id") ?? ""} ${f.attr("class") ?? ""}`);
    if (fields.length === 0) return;
    const joined = fields.join(" | ");
    if (fields.length === 1 && !/mail|phone|mobile|number|name/i.test(fields[0])) return;
    if (/password|sort by|filter|search|coupon|promo code|quantity|\bqty\b|min price|max price/i.test(joined)) return;
    if (fields.some((f) => /^(from|to|min|max)$/i.test(f))) return;
    forms.push({ page: url.pathname || "/", fields: [...new Set(fields)].slice(0, 8), purpose: formPurpose(ctx, fields) });
  });

  const siteName =
    $('meta[property="og:site_name"]').attr("content") ??
    (jsonLd.find((j) => typeof j.name === "string")?.name as string | undefined) ??
    "";
  const description =
    $('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? "";
  const title = clean($("title").first().text());

  $("script, style, noscript, svg, template, iframe").remove();

  // Prices: leaf-ish blocks containing a currency amount.
  const prices: PriceItem[] = [];
  const seenPrice = new Set<string>();
  $("tr").each((_, tr) => {
    const cells = $(tr).find("td, th").map((_, c) => clean($(c).text())).get();
    const priceCell = cells.find((c) => PRICE_RE.test(c));
    const nameCell = cells.find((c) => c && !PRICE_RE.test(c));
    if (priceCell && nameCell && !JUNK_PRICE_NAME.test(nameCell)) {
      const key = `${nameCell}|${priceCell}`.toLowerCase();
      if (!seenPrice.has(key)) {
        seenPrice.add(key);
        prices.push({ name: nameCell.slice(0, 60), price: priceCell.match(PRICE_RE)![0].trim() });
      }
    }
  });
  $("li, p, div, span, h3, h4, dd").each((_, el) => {
    const node = $(el);
    if (node.children("li, p, div, tr, table, ul").length > 0) return;
    const text = clean(node.text());
    if (text.length < 4 || text.length > 110) return;
    const m = text.match(PRICE_RE);
    if (!m) return;
    let name = clean(text.replace(m[0], "").replace(/[:\-–|•·.]+\s*$/g, "").replace(/^[:\-–|•·]+/g, ""));
    if (name.length < 3) {
      name = clean(node.prev().text() || node.parent().children().first().text()).slice(0, 60);
    }
    if (name.length < 3 || name.length > 60 || PRICE_RE.test(name) || JUNK_PRICE_NAME.test(name)) return;
    const key = `${name}|${m[0]}`.toLowerCase();
    if (seenPrice.has(key)) return;
    seenPrice.add(key);
    prices.push({ name, price: m[0].trim() });
  });

  // FAQs
  const faqs: FaqItem[] = [];
  $("details").each((_, d) => {
    const q = clean($(d).find("summary").first().text());
    const a = clean($(d).clone().find("summary").remove().end().text());
    if (q && a) faqs.push({ q: q.slice(0, 160), a: a.slice(0, 400) });
  });
  $("h2, h3, h4, h5, dt, strong, b").each((_, h) => {
    const q = clean($(h).text());
    if (!q.endsWith("?") || q.length > 160 || q.length < 8) return;
    const a = clean($(h).next().text() || $(h).parent().next().text());
    if (a && !faqs.some((f) => f.q === q)) faqs.push({ q, a: a.slice(0, 400) });
  });

  $("br, p, div, li, td, th, h1, h2, h3, h4, h5, h6, a, span, section, header, footer, nav, label, option, summary, dt, dd, address, button").after(" ");
  const bodyText = clean($("body").text());
  const hours = [...new Set((bodyText.match(HOURS_RE) ?? []).map(clean))].slice(0, 6);
  for (const m of bodyText.match(EMAIL_RE) ?? []) if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(m)) emails.add(m.toLowerCase());
  for (const m of bodyText.match(PHONE_RE) ?? []) phones.add(digitsOnly(m));

  const address =
    clean($("address").first().text()) ||
    (() => {
      const m = bodyText.match(/address[:\s]+([^|]{10,140}?(?:\d{6}|delhi|mumbai|bengaluru|bangalore|india))/i);
      return m ? clean(m[1]) : "";
    })();

  const headings = $("h1, h2, h3")
    .map((_, h) => clean($(h).text()))
    .get()
    .filter((h) => h.length > 2 && h.length < 70);

  return {
    url: url.toString(),
    title,
    links,
    internal,
    whatsapp: [...whatsapp],
    emails: [...emails],
    phones: [...phones],
    forms,
    embeds: [...embeds],
    socials: [...socials],
    prices: prices.slice(0, 40),
    faqs: faqs.slice(0, 20),
    hours,
    address,
    headings,
    text: bodyText.slice(0, 7000),
    jsonLd,
    siteName: clean(siteName),
    description: clean(description),
  };
}

/* ------------------------------------------------------------------ crawling */

const PRIORITY =
  /contact|price|pricing|rate|menu|service|treatment|book|appointment|about|faq|fees|admission|course|package|reach|location|visit|shop|order/i;

function pickPages(home: PageData, base: URL): string[] {
  const seen = new Set([home.url, base.toString()]);
  const scored = home.internal
    .filter((l) => !/\.(pdf|jpe?g|png|gif|webp|zip|mp4|docx?)$/i.test(l.href))
    .filter((l) => !/login|signin|cart|checkout|account|wp-admin|privacy|terms|cookie/i.test(l.href))
    .map((l) => ({ href: l.href, score: PRIORITY.test(`${l.href} ${l.text}`) ? 2 : 0 }))
    .filter((l) => l.score > 0);
  const out: string[] = [];
  for (const l of scored.sort((a, b) => b.score - a.score)) {
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    out.push(l.href);
    if (out.length >= MAX_EXTRA_PAGES) break;
  }
  return out;
}

function detectBusinessType(text: string): BusinessType {
  const t = text.toLowerCase();
  const score = (words: string[]) =>
    words.reduce((n, w) => {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tail = /\w$/.test(w) ? "(?:s|es)?\\b" : "";
      return n + (t.match(new RegExp(`\\b${esc}${tail}`, "g"))?.length ?? 0);
    }, 0);
  const table: [BusinessType, number][] = [
    ["salon", score(["salon", "facial", "haircut", "hair spa", "manicure", "pedicure", "makeup", "bridal", "waxing", "beauty", "threading"])],
    ["clinic", score(["clinic", "doctor", "dr.", "patient", "treatment", "dental", "physio", "consultation", "hospital", "diagnosis"])],
    ["restaurant", score(["restaurant", "menu", "cafe", "dine", "food", "cuisine", "table", "delivery", "biryani", "coffee"])],
    ["education", score(["course", "classes", "coaching", "admission", "students", "batch", "tuition", "academy", "exam"])],
    ["fitness", score(["gym", "fitness", "yoga", "workout", "trainer", "membership", "zumba"])],
    ["retail", score(["shop", "store", "cart", "product", "buy now", "shipping", "order now"])],
  ];
  const best = table.sort((a, b) => b[1] - a[1])[0];
  return best[1] >= 3 ? best[0] : "services";
}

function fromJsonLd(items: Record<string, unknown>[]) {
  const out = { name: "", address: "", phone: "", hours: [] as string[] };
  for (const j of items) {
    if (!out.name && typeof j.name === "string") out.name = j.name;
    const addr = j.address as Record<string, string> | string | undefined;
    if (!out.address && addr) {
      out.address =
        typeof addr === "string"
          ? addr
          : [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean).join(", ");
    }
    if (!out.phone && typeof j.telephone === "string") out.phone = digitsOnly(j.telephone);
    const oh = j.openingHours;
    if (typeof oh === "string") out.hours.push(oh);
    else if (Array.isArray(oh)) out.hours.push(...oh.filter((x): x is string => typeof x === "string"));
  }
  return out;
}

function guessName(home: PageData, host: string): string {
  if (home.siteName) return home.siteName;
  const fromTitle = home.title.split(/\s[|\-–—:]\s/)[0]?.trim();
  if (fromTitle && fromTitle.length <= 50) return fromTitle;
  return host.replace(/^www\./, "").split(".")[0].replace(/^\w/, (c) => c.toUpperCase());
}

export async function crawl(input: string, log: Log): Promise<SiteKnowledge> {
  const start = normalizeUrl(input);
  log("info", `Opening ${start.hostname}`);
  const home = await fetchPage(start);
  const base = home.url;
  const pages: PageData[] = [extractPage(base, home.html)];
  log("ok", `Loaded homepage: "${pages[0].title || base.hostname}"`);

  const extra = pickPages(pages[0], base);
  if (extra.length) log("info", `Following ${extra.length} key page${extra.length > 1 ? "s" : ""}: ${extra.map((u) => new URL(u).pathname).join(", ")}`);
  const results = await Promise.allSettled(extra.map((u) => fetchPage(new URL(u))));
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      pages.push(extractPage(r.value.url, r.value.html));
      log("ok", `Read ${new URL(extra[i]).pathname}`);
    } else {
      log("warn", `Skipped ${new URL(extra[i]).pathname} (couldn't load)`);
    }
  });

  const uniq = <T,>(xs: T[]) => [...new Set(xs)];
  const all = <K extends keyof PageData>(k: K) => pages.flatMap((p) => p[k] as unknown as unknown[]);
  const ld = fromJsonLd(pages.flatMap((p) => p.jsonLd));

  const prices: PriceItem[] = [];
  const seen = new Set<string>();
  for (const p of all("prices") as PriceItem[]) {
    const key = p.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      prices.push(p);
    }
  }

  const faqs: FaqItem[] = [];
  for (const f of all("faqs") as FaqItem[]) if (!faqs.some((x) => x.q === f.q)) faqs.push(f);

  const fullText = pages.map((p) => `## ${p.title || p.url}\n${p.text}`).join("\n\n");
  const phones = uniq([...(ld.phone ? [ld.phone] : []), ...(all("phones") as string[])]).filter((p) => p.replace(/\D/g, "").length >= 10);

  const services = uniq(pages.flatMap((p) => p.headings))
    .filter((h) => !/contact|about|faq|question|price|welcome|home|follow|hours|visit|menu|©/i.test(h))
    .slice(0, 16);

  return {
    url: base.toString(),
    name: ld.name || guessName(pages[0], base.hostname),
    description: pages[0].description,
    businessType: detectBusinessType(fullText),
    pages: pages.map((p) => ({ url: p.url, title: p.title })),
    prices: prices.slice(0, 40),
    faqs: faqs.slice(0, 20),
    hours: uniq([...ld.hours, ...(all("hours") as string[])]).slice(0, 6),
    address: ld.address || pages.map((p) => p.address).find(Boolean) || "",
    phones: phones.slice(0, 4),
    emails: uniq(all("emails") as string[]).slice(0, 4),
    whatsapp: uniq(all("whatsapp") as string[]).slice(0, 3),
    forms: (all("forms") as FormInfo[]).slice(0, 6),
    embeds: uniq(all("embeds") as string[]),
    socials: uniq(all("socials") as string[]),
    services,
    text: fullText.slice(0, 24000),
  };
}
