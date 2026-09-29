import "server-only";
import { lookup } from "node:dns/promises";
import { readFile } from "node:fs/promises";
import path from "node:path";
import * as cheerio from "cheerio";
import { isPublicHost } from "./net";
import { instagramHandle, LINK_HUBS, NOT_A_WEBSITE, readInstagram } from "./instagram";
import { renderPage } from "./render";
const MAX_BYTES = 2_500_000;
const MAX_EXTRA_PAGES = 5;
const FETCH_TIMEOUT_MS = 10_000;
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126 Safari/537.36 Weblyy/1.0";
export const DEMO_URL = "https://kesar-beauty.demo/";
const DEMO_HOST = "kesar-beauty.demo";
export class CrawlError extends Error {
  /** True when a real browser might get through (bot blocking, timeouts, server errors). */
  constructor(message, retryable = false) {
    super(message);
    this.retryable = retryable;
  }
}
/* ---------------------------------------------------------------- URL safety */
export function normalizeUrl(input) {
  let raw = input.trim();
  if (!raw) throw new CrawlError("Please enter a website address.");
  if (raw.toLowerCase() === "demo") return new URL(DEMO_URL);
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;
  let url;
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
async function assertPublicHost(hostname) {
  const host = hostname.replace(/^\[|\]$/g, "");
  if (!(await isPublicHost(host))) {
    try {
      await lookup(host);
    } catch {
      throw new CrawlError(`Couldn't find ${host}. Check the spelling?`);
    }
    throw new CrawlError("Local and private addresses can't be scanned.");
  }
}
/* ------------------------------------------------------------------ fetching */
async function readCapped(res) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks = [];
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
async function fetchDemoPage(url) {
  const slug = url.pathname.replace(/^\/+|\/+$/g, "").replace(/\.html$/, "") || "index";
  if (!/^[a-z-]+$/.test(slug)) throw new CrawlError("Page not found");
  const file = path.join(process.cwd(), "public", "demo", "kesar", `${slug}.html`);
  const html = await readFile(file, "utf8").catch(() => {
    throw new CrawlError("Page not found");
  });
  return { url, html };
}
export async function fetchPage(start) {
  if (start.hostname === DEMO_HOST) return fetchDemoPage(start);
  let url = start;
  for (let hop = 0; hop < 5; hop++) {
    await assertPublicHost(url.hostname);
    let res;
    try {
      res = await fetch(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      });
    } catch (e) {
      const timedOut = e instanceof Error && e.name === "TimeoutError";
      throw new CrawlError(timedOut ? `${url.hostname} took too long to respond.` : `Couldn't reach ${url.hostname}.`, true);
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
      throw new CrawlError(`${url.hostname} answered with error ${res.status}.`, res.status === 403 || res.status === 429 || res.status >= 500);
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
const EMBEDS = [
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
const SOCIALS = [
  [/instagram\.com/i, "Instagram"],
  [/facebook\.com|fb\.me/i, "Facebook"],
  [/linkedin\.com/i, "LinkedIn"],
  [/youtube\.com|youtu\.be/i, "YouTube"],
  [/(twitter|x)\.com\//i, "X / Twitter"],
];
const PRICE_RE = /(?:₹|rs\.?|inr|\$|£|€)\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:-|–|to)\s?(?:₹|rs\.?)?\s?\d[\d,]*)?\s?\+?|\d[\d,]{1,7}\s?(?:\/-|rs\b|inr\b)/i;
const JUNK_PRICE_NAME =
  /^(?:the\s+)?(?:regular|sale|unit|original|final|special|offer|discounted|highest|lowest|total|sub-?total|starting|mrp|price|from|to|save|you save|was|now|only|per|each|incl\.?|excl\.?|tax|gst|shipping|delivery|off|\s|is|\d|%|:)+$/i;
const GENERIC_PRICE_NAME =
  /^(course|courses|team|package|packages|plan|plans|fees?|amount|cost|rate|rates|charges?|product|item|service|services|book now|buy now|enrol+ now|pay now|details|view|price list)$/i;
const JUNK_PRICE_WORDS =
  /\bworth\b|rating|review|starting at|cost starting|\bsave\b|discount|% off|\bemi\b|cashback|\bcoupon|\bvoucher|\bfree\b|\bwallet\b|\bshipping\b|\bcart\b|\bsubtotal\b/i;
const PHONE_RE = /(?:\+91[\s-]?)?\b[6-9]\d{4}[\s-]?\d{5}\b/g;
const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const HOURS_RE =
  /\b(?:mon|tue|wed|thu|fri|sat|sun|daily|everyday|all days|open)[a-z]*\b[^\n]{0,70}?\d{1,2}(?::\d{2})?\s?(?:am|pm)[^\n]{0,30}?\d{1,2}(?::\d{2})?\s?(?:am|pm)/gi;
const HOURS_RE2 =
  /\b(?:timings?|hours|open(?:ing)?(?: hours)?|we are open)\b[:\s-]+[^\n]{0,24}?\d{1,2}(?::\d{2})?\s?(?:am|pm)\s?(?:-|–|to)\s?\d{1,2}(?::\d{2})?\s?(?:am|pm)/gi;
const clean = (s) => s.replace(/\s+/g, " ").trim();
function digitsOnly(s) {
  return s.replace(/[^\d+]/g, "");
}
function whatsappNumber(href) {
  try {
    const u = new URL(href);
    if (/wa\.me$/i.test(u.hostname)) return digitsOnly(u.pathname) || "WhatsApp link";
    if (/whatsapp\.com$/i.test(u.hostname)) return digitsOnly(u.searchParams.get("phone") ?? "") || "WhatsApp link";
  } catch {
    if (href.startsWith("whatsapp:")) return "WhatsApp link";
  }
  return null;
}
const CTA_RE = /book|appointment|call now|whatsapp|chat|enquir|inquir|contact us|get a quote|order|reserve|schedule|register|enrol|sign up/i;
const JUNK_IMG = /icon|logo|sprite|pixel|avatar|placeholder|loader|spinner|whatsapp|payment|badge|flag|arrow|emoji|gravatar|\.svg(\?|$)|data:image/i;
function absUrl(src, base) {
  if (!src) return "";
  try {
    const u = new URL(src.trim().split(/\s+/)[0], base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : "";
  } catch {
    return "";
  }
}
/** Words and brand marks copied from the page as-is, for a redesign that keeps them. */
function extractContent($, url, jsonLd) {
  const text = (el) => clean(el.text());
  $("h1 br, h2 br, h3 br, p br").replaceWith(" ");
  const h1 = $("h1").first();
  const headline = text(h1).slice(0, 140);
  let subheadline = "";
  if (h1.length) {
    const near = h1.nextAll("p").first().length ? h1.nextAll("p").first() : h1.parent().find("p").first();
    const t = text(near);
    if (t.length >= 25 && t.length <= 320) subheadline = t;
  }
  const inChrome = (el) => el.closest("header, nav, footer, form").length > 0;
  const paras = (scope) =>
    scope
      .find("p")
      .map((_, p) => clean($(p).text()))
      .get()
      .filter((t) => t.length >= 60 && t.length <= 700 && !/cookie|copyright|all rights reserved|©/i.test(t));
  const isAboutPage = /about|story|who-we-are|our-team/i.test(url.pathname);
  let about = [];
  if (isAboutPage) about = paras($("main").length ? $("main") : $("body")).slice(0, 4);
  else {
    $("h2, h3").each((_, h) => {
      if (about.length || !/about|who we are|our story|welcome|why choose/i.test($(h).text())) return;
      const sec = $(h).closest("section").length ? $(h).closest("section") : $(h).parent();
      about = paras(sec).slice(0, 3);
    });
  }
  const sections = [];
  $("h2, h3").each((_, h) => {
    const el = $(h);
    const heading = text(el);
    if (inChrome(el) || heading.length < 3 || heading.length > 80 || heading.endsWith("?")) return;
    const next = clean(el.nextAll("p").first().text() || el.parent().find("p").first().text());
    if (next.length >= 40 && next.length <= 500 && !sections.some((s) => s.text === next)) sections.push({ heading, text: next, page: url.pathname || "/" });
  });
  const testimonials = [];
  // A testimonial is a box holding exactly one longish quote (a card), not a section holding several.
  const quoteText = (q) => clean(q.text()).replace(/^[“"']|[”"']$/g, "");
  $('[class*="testimonial" i], [id*="testimonial" i], [class*="review" i], blockquote').each((_, el) => {
    const box = $(el);
    // Whole words only: "preview" or "reviewed-by" widgets aren't reviews.
    if (
      !box.is("blockquote") &&
      !/(^|[\s_-])(reviews?|testimonials?)([\s_-]|$)|^(reviews?|testimonials?)|(review|testimonial)(card|item|box|text|slide)/i.test(
        `${box.attr("class") ?? ""} ${box.attr("id") ?? ""}`,
      )
    )
      return;
    const quotes = (box.is("p, blockquote") ? box : box.find("blockquote, p")).filter((_, q) => quoteText($(q)).length >= 30);
    if (quotes.length !== 1) return;
    const quote = quoteText(quotes.first());
    if (quote.length > 450 || PRICE_RE.test(quote) || testimonials.some((t) => t.quote === quote)) return;
    const author = clean(box.find('cite, [class*="name" i], [class*="author" i], strong, h4, h5').first().text()).replace(/^[—–-]\s*/, "");
    testimonials.push({ quote, author: author.length <= 60 && author !== quote ? author : "" });
  });
  const nav = [
    ...new Set(
      $("header nav a, nav a, header a")
        .map((_, a) => clean($(a).text()))
        .get()
        .filter((t) => t.length > 1 && t.length <= 28),
    ),
  ].slice(0, 12);
  const ctas = [
    ...new Set(
      $("a, button")
        .map((_, el) => clean($(el).text()))
        .get()
        .filter((t) => t.length > 1 && t.length <= 40 && CTA_RE.test(t)),
    ),
  ].slice(0, 8);
  const ldLogo = jsonLd.map((j) => j.logo).find(Boolean);
  const logoEl = $('header img, [class*="logo" i] img, img[class*="logo" i], img[id*="logo" i], img[alt*="logo" i], img[src*="logo" i]').first();
  const logo =
    absUrl(logoEl.attr("src") ?? logoEl.attr("data-src"), url) ||
    absUrl(typeof ldLogo === "string" ? ldLogo : typeof ldLogo === "object" ? String(ldLogo.url ?? "") : "", url);
  const images = [];
  $("img").each((_, img) => {
    const el = $(img);
    const src = absUrl(el.attr("src") ?? el.attr("data-src") ?? el.attr("data-lazy-src") ?? el.attr("srcset"), url);
    const w = Number(el.attr("width") ?? 0);
    if (!src || JUNK_IMG.test(src) || (w && w < 240) || el.closest("header, nav, footer").length) return;
    if (!images.some((i) => i.src === src)) images.push({ src, alt: clean(el.attr("alt") ?? "").slice(0, 120) });
  });
  return {
    headline,
    subheadline,
    about,
    sections: sections.slice(0, 10),
    testimonials: testimonials.slice(0, 8),
    nav,
    ctas,
    logo,
    favicon: absUrl($('link[rel="apple-touch-icon"]').attr("href") ?? $('link[rel~="icon"]').attr("href"), url),
    ogImage: absUrl($('meta[property="og:image"]').attr("content"), url),
    themeColor: clean($('meta[name="theme-color"]').attr("content") ?? ""),
    images: images.slice(0, 12),
  };
}
function pageStructure($) {
  const levels = $("h1, h2, h3, h4, h5, h6")
    .map((_, h) => Number(h.tagName.slice(1)))
    .get();
  let headingSkips = 0;
  levels.reduce((prev, l) => {
    if (l > prev + 1) headingSkips++;
    return l;
  }, 0);
  return {
    h1Count: $("h1").length,
    headingSkips,
    lang: $("html").attr("lang") ?? "",
    canonical: $('link[rel="canonical"]').length > 0,
    ogTitle: $('meta[property="og:title"]').length > 0,
    navCount: new Set(
      $("nav a, header a")
        .map((_, a) => clean($(a).text()).toLowerCase())
        .get()
        .filter((t) => t.length > 1),
    ).size,
    contactLinks: $('a[href^="tel:"], a[href*="wa.me"], a[href*="whatsapp.com"], a[href^="mailto:"]').length,
  };
}
function fieldLabel($, el) {
  const id = el.attr("id");
  const label = id ? clean($(`label[for="${id}"]`).first().text()) : "";
  return label || el.attr("placeholder") || el.attr("aria-label") || el.attr("name") || "";
}
function formPurpose(text, fields) {
  const t = `${text} ${fields.join(" ")}`.toLowerCase();
  if (/book|appointment|slot|reserv|schedule|date/.test(t)) return "booking";
  if (/newsletter|subscribe/.test(t)) return "newsletter";
  if (/admission|enrol|enroll|course|demo class/.test(t)) return "admission";
  if (/order|quantity|cart/.test(t)) return "order";
  return "enquiry";
}
export function extractPage(url, html) {
  const $ = cheerio.load(html);
  const jsonLd = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const data = JSON.parse($(el).text());
      const list = Array.isArray(data) ? data : (data["@graph"] ?? [data]);
      for (const item of list) if (item && typeof item === "object") jsonLd.push(item);
    } catch {
      /* malformed JSON-LD is common, skip it */
    }
  });
  const embeds = new Set();
  const scriptBlob = $("script")
    .map((_, el) => `${$(el).attr("src") ?? ""} ${$(el).text().slice(0, 4000)}`)
    .get()
    .join(" ");
  const iframeBlob = $("iframe")
    .map((_, el) => $(el).attr("src") ?? "")
    .get()
    .join(" ");
  const whatsapp = new Set();
  const emails = new Set();
  const phones = new Set();
  const socials = new Set();
  const socialLinks = [];
  let mapUrl = "";
  const links = [];
  const internal = [];
  $("a[href]").each((_, el) => {
    const href = ($(el).attr("href") ?? "").trim();
    const text = clean($(el).text());
    if (!href) return;
    links.push(href);
    const wa = whatsappNumber(href);
    if (wa) return void whatsapp.add(wa);
    if (href.startsWith("mailto:")) {
      const e = decodeURIComponent(href.slice(7).split("?")[0]).replace(/\s+/g, "").toLowerCase();
      if (/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(e)) emails.add(e);
      return;
    }
    if (href.startsWith("tel:")) return void phones.add(digitsOnly(href.slice(4)));
    for (const [re, name] of SOCIALS)
      if (re.test(href) && !/sharer|share\?|intent\/tweet|\/share/i.test(href)) {
        if (!socials.has(name)) socialLinks.push({ name, url: href });
        socials.add(name);
      }
    if (!mapUrl && /google\.[a-z.]+\/maps|maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/i.test(href)) mapUrl = href;
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
  if ($("[data-weblyy-chat]").length) embeds.add("AI chat assistant");
  const linkBlob = links.join(" ");
  for (const [re, name] of EMBEDS) if (re.test(scriptBlob) || re.test(iframeBlob) || re.test(linkBlob)) embeds.add(name);
  const forms = [];
  $("form").each((_, form) => {
    const f = $(form);
    const fields = [];
    f.find("input, select, textarea").each((_, input) => {
      const inp = $(input);
      const type = (inp.attr("type") ?? "").toLowerCase();
      if (["hidden", "submit", "button", "image", "reset"].includes(type)) return;
      const label = clean(fieldLabel($, inp)).slice(0, 40);
      if (label && !/captcha|honeypot|^_|nonce|token|referrer|utm_|^hp$|leave this empty/i.test(label)) fields.push(label);
    });
    const ctx = clean(`${f.text()} ${f.attr("action") ?? ""} ${f.attr("id") ?? ""} ${f.attr("class") ?? ""}`);
    if (fields.length === 0) return;
    const joined = fields.join(" | ");
    if (fields.length === 1 && !/mail|phone|mobile|number|name/i.test(fields[0])) return;
    if (/password|sort by|filter|search|coupon|promo code|quantity|\bqty\b|min price|max price/i.test(joined)) return;
    if (fields.some((f) => /^(from|to|min|max)$/i.test(f))) return;
    forms.push({ page: url.pathname || "/", fields: [...new Set(fields)].slice(0, 8), purpose: formPurpose(ctx, fields) });
  });
  const siteName = $('meta[property="og:site_name"]').attr("content") ?? jsonLd.find((j) => typeof j.name === "string")?.name ?? "";
  const description = $('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? "";
  const title = clean($("title").first().text());
  const ctaCount = $("a, button").filter((_, el) => CTA_RE.test($(el).text())).length;
  const signalsBase = {
    https: url.protocol === "https:",
    viewport: $('meta[name="viewport"]').length > 0,
    title,
    h1: clean($("h1").first().text()).slice(0, 120),
    metaDescription: clean($('meta[name="description"]').attr("content") ?? ""),
    jsonLdTypes: [
      ...new Set(
        jsonLd.flatMap((j) => {
          const t = j["@type"];
          return Array.isArray(t) ? t.map(String) : t ? [String(t)] : [];
        }),
      ),
    ],
    ctaCount,
    ogImage: $('meta[property="og:image"]').length > 0,
    ...pageStructure($),
  };
  const content = extractContent($, url, jsonLd);
  $("script, style, noscript, svg, template, iframe").remove();
  // Prices: leaf-ish blocks containing a currency amount.
  const prices = [];
  const seenPrice = new Set();
  $("tr").each((_, tr) => {
    const cells = $(tr)
      .find("td, th")
      .map((_, c) => clean($(c).text()))
      .get();
    const priceCell = cells.find((c) => PRICE_RE.test(c));
    const nameCell = cells.find((c) => c && !PRICE_RE.test(c));
    if (priceCell && nameCell && !JUNK_PRICE_NAME.test(nameCell) && !JUNK_PRICE_WORDS.test(nameCell)) {
      const key = `${nameCell}|${priceCell}`.toLowerCase();
      if (!seenPrice.has(key)) {
        seenPrice.add(key);
        prices.push({ name: nameCell.slice(0, 60), price: priceCell.match(PRICE_RE)[0].trim() });
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
    let name = clean(
      text
        .replace(m[0], "")
        .replace(/[:\-–|•·.!]+\s*$/g, "")
        .replace(/^[:\-–|•·]+/g, "")
        .replace(/\b(from|starts?|starting|only|just|@|at)\s*$/i, "")
        .replace(/\s*(cost|price|charges?)\s+in\s+[a-z ]+$/i, ""),
    )
      .replace(/[:\-–|•·(]+$/g, "")
      .trim();
    if (name.length < 3) {
      name = clean(node.prev().text() || node.parent().children().first().text()).slice(0, 60);
    }
    if (
      name.length < 3 ||
      name.length > 60 ||
      PRICE_RE.test(name) ||
      JUNK_PRICE_NAME.test(name) ||
      JUNK_PRICE_WORDS.test(name) ||
      GENERIC_PRICE_NAME.test(name)
    )
      return;
    if (!/[a-z]{3}/i.test(name) || /^\(|\(\s*\)/.test(name)) return;
    const key = `${name}|${m[0]}`.toLowerCase();
    if (seenPrice.has(key)) return;
    seenPrice.add(key);
    prices.push({ name, price: m[0].trim() });
  });
  // FAQs
  const faqs = [];
  $("details").each((_, d) => {
    const q = clean($(d).find("summary").first().text());
    const a = clean($(d).clone().find("summary").remove().end().text());
    if (q && a) faqs.push({ q: q.slice(0, 160), a: a.slice(0, 400) });
  });
  $("h2, h3, h4, h5, dt, strong, b").each((_, h) => {
    const q = clean($(h).text());
    if (!q.endsWith("?") || q.length > 160 || q.length < 8) return;
    const a = clean($(h).next().text() || $(h).parent().next().text());
    const cta = /^(ready to|want to|looking for|need|why wait|what are you waiting|book|call|get|start|join|contact)\b/i.test(q) || /[a-z][A-Z]/.test(q);
    if (a && !cta && !faqs.some((f) => f.q === q)) faqs.push({ q, a: a.slice(0, 400) });
  });
  $("br, p, div, li, td, th, h1, h2, h3, h4, h5, h6, a, span, section, header, footer, nav, label, option, summary, dt, dd, address, button").after(" ");
  const bodyText = clean($("body").text());
  const hours = [
    ...new Set(
      [...(bodyText.match(HOURS_RE) ?? []), ...(bodyText.match(HOURS_RE2) ?? [])]
        .map((h) => clean(h).replace(/^(?:we are open|opening hours|business hours|timings?|hours|open)\b[:\s-]*/i, ""))
        .filter((h) => h.length > 6),
    ),
  ].slice(0, 6);
  for (const m of bodyText.match(EMAIL_RE) ?? []) if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(m)) emails.add(m.toLowerCase());
  for (const m of bodyText.match(PHONE_RE) ?? []) phones.add(digitsOnly(m));
  const address =
    clean($("address").first().text()) ||
    (() => {
      const m = bodyText.match(
        /address[:\s]+([^|]{10,140}?(?:\d{6}|delhi|gurugram|gurgaon|noida|mumbai|thane|jammu|srinagar|kashmir|bengaluru|bangalore|india))/i,
      );
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
    socialLinks,
    mapUrl,
    prices: prices.slice(0, 40),
    faqs: faqs.slice(0, 20),
    hours,
    address,
    headings,
    text: bodyText.slice(0, 7000),
    jsonLd,
    siteName: clean(siteName),
    description: clean(description),
    signals: { ...signalsBase, wordCount: bodyText.split(/\s+/).length },
    content,
  };
}
/* ------------------------------------------------------------------ crawling */
const PRIORITY = /contact|price|pricing|rate|menu|service|treatment|book|appointment|about|faq|fees|admission|course|package|reach|location|visit|shop|order/i;
function pickPages(homes, base) {
  const seen = new Set([...homes.map((h) => h.url), base.toString()]);
  const scored = homes
    .flatMap((h) => h.internal)
    .filter((l) => !/\.(pdf|jpe?g|png|gif|webp|zip|mp4|docx?)$/i.test(l.href))
    .filter((l) => !/login|signin|cart|checkout|account|wp-admin|privacy|terms|cookie/i.test(l.href))
    .map((l) => ({ href: l.href, score: PRIORITY.test(`${l.href} ${l.text}`) ? 2 : 0 }))
    .filter((l) => l.score > 0);
  const out = [];
  for (const l of scored.sort((a, b) => b.score - a.score)) {
    if (seen.has(l.href)) continue;
    seen.add(l.href);
    out.push(l.href);
    if (out.length >= MAX_EXTRA_PAGES) break;
  }
  return out;
}
function detectBusinessType(text) {
  const t = text.toLowerCase();
  const score = (words) =>
    words.reduce((n, w) => {
      const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const tail = /\w$/.test(w) ? "(?:s|es)?\\b" : "";
      return n + (t.match(new RegExp(`\\b${esc}${tail}`, "g"))?.length ?? 0);
    }, 0);
  const table = [
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
function fromJsonLd(items) {
  const out = { name: "", address: "", phone: "", hours: [] };
  // Prefer the entity that describes the business itself (has an address or phone), not the web page.
  const biz = items.find((j) => typeof j.name === "string" && (j.address || j.telephone));
  if (biz) out.name = biz.name;
  for (const j of items) {
    const type = String(j["@type"] ?? "");
    if (!out.name && typeof j.name === "string" && !/WebPage|WebSite|Article|BreadcrumbList|ImageObject|FAQPage/i.test(type)) out.name = j.name;
    const addr = j.address;
    if (!out.address && addr) {
      out.address =
        typeof addr === "string" ? addr : [addr.streetAddress, addr.addressLocality, addr.addressRegion, addr.postalCode].filter(Boolean).join(", ");
    }
    if (!out.phone && typeof j.telephone === "string") out.phone = digitsOnly(j.telephone);
    const oh = j.openingHours;
    if (typeof oh === "string") out.hours.push(oh);
    else if (Array.isArray(oh)) out.hours.push(...oh.filter((x) => typeof x === "string"));
  }
  return out;
}
/** Template leftovers like "Best Cosmetic Dentistry in , " aren't a business name. */
const brokenName = (n) => !n.trim() || /\s,|,\s*$|\bin\s*,|\{\{|%s|undefined|null/i.test(n) || n.trim().length < 2;
function guessName(home, host) {
  if (home.siteName && !brokenName(home.siteName)) return home.siteName;
  const root = host
    .replace(/^www\./, "")
    .split(".")[0]
    .toLowerCase();
  const parts = home.title
    .split(/\s[|\-–—]\s|\s?[|:]\s/)
    .map((p) => p.trim())
    .filter(Boolean);
  // "Best Dental Clinic in India | Apollo Dental": the part that matches the domain is the name.
  const squash = (p) => p.toLowerCase().replace(/[^a-z0-9]/g, "");
  const byHost = parts.find((p) => p.length <= 50 && squash(p).length >= 3 && (root.includes(squash(p)) || squash(p).includes(root)));
  if (byHost) return byHost;
  if (parts[0] && parts[0].length <= 50 && !/^(best|top|no\.?\s?1|leading)\b/i.test(parts[0])) return parts[0];
  return root.replace(/^\w/, (c) => c.toUpperCase());
}
const MAX_RENDERS = 3;
const PARKED =
  /\b(is parked|parked free|domain (?:is|may be) for sale|buy this domain|get this domain|this domain is available|hugedomains|sedo domain parking|dan\.com)\b/i;
async function crawlSite(input, log) {
  const start = normalizeUrl(input);
  const isDemo = start.hostname === DEMO_HOST;
  log("info", `Opening ${start.hostname}`);
  const pages = [];
  let renders = 0;
  let staticError = null;
  let base = start;
  try {
    const home = await fetchPage(start);
    base = home.url;
    pages.push(extractPage(home.url, home.html));
    log("ok", `Loaded homepage: "${pages[0].title || base.hostname}"`);
  } catch (e) {
    if (!(e instanceof CrawlError) || !e.retryable || isDemo) throw e;
    staticError = e;
    log("warn", `${e.message} Trying a real browser instead.`);
  }
  // A real browser sees what plain HTML can't: JavaScript-built pages and injected WhatsApp/chat widgets.
  // It runs alongside the other page fetches instead of before them.
  if (staticError) {
    const r = await renderPage(base.toString(), 15_000, 2);
    if (!r) throw staticError;
    renders++;
    const rp = extractPage(new URL(r.url), r.html);
    pages.push(rp);
    base = new URL(r.url);
    log("ok", `Loaded in the browser: "${rp.title || base.hostname}"`);
  }
  if (!pages.length) throw staticError ?? new CrawlError("Couldn't load that site.");
  const homeText = pages.map((p) => p.text).join(" ");
  if (PARKED.test(homeText) && homeText.length < 3000) {
    throw new CrawlError(`${base.hostname} is a parked domain with no business website on it yet. Try the business's current site.`);
  }
  if (/\b(coming soon|under construction|site is under maintenance)\b/i.test(homeText) && homeText.length < 600) {
    throw new CrawlError(`${base.hostname} only shows a "coming soon" page right now, so there's nothing to scan yet.`);
  }
  const homeRender =
    !isDemo && !staticError
      ? (log("info", "Checking it in a real browser for JavaScript-loaded buttons and widgets"), renderPage(base.toString()))
      : Promise.resolve(null);
  const readExtra = async (list) => {
    if (!list.length) return;
    log("info", `Reading ${list.length} key page${list.length > 1 ? "s" : ""}: ${list.map((u) => new URL(u).pathname).join(", ")}`);
    const results = await Promise.allSettled(list.map((u) => fetchPage(new URL(u))));
    const thin = [];
    results.forEach((r, i) => {
      const path = new URL(list[i]).pathname;
      const page = r.status === "fulfilled" ? extractPage(r.value.url, r.value.html) : null;
      if (page) pages.push(page);
      if (!page || page.text.length < 400) thin.push(list[i]);
      else log("ok", `Read ${path}`);
    });
    if (isDemo) return;
    const rendered = await Promise.all(thin.slice(0, MAX_RENDERS).map((u) => renderPage(u, 12_000)));
    rendered.forEach((rr, i) => {
      const path = new URL(thin[i]).pathname;
      if (rr) {
        renders++;
        pages.push(extractPage(new URL(rr.url), rr.html));
        log("ok", `Read ${path} in the browser`);
      } else if (!pages.some((p) => p.url === thin[i])) log("warn", `Skipped ${path} (couldn't load)`);
    });
  };
  const first = pickPages(pages, base);
  const [rendered] = await Promise.all([homeRender, readExtra(first)]);
  if (rendered) {
    renders++;
    const rp = extractPage(new URL(rendered.url), rendered.html);
    pages.push(rp);
    if (PARKED.test(rp.text) && rp.text.length < 3000) {
      throw new CrawlError(`${base.hostname} is a parked domain with no business website on it yet. Try the business's current site.`);
    }
    log("ok", "Browser view captured");
    // JavaScript-built sites only reveal their menu links in the browser.
    const more = pickPages(pages, base)
      .filter((u) => !first.includes(u))
      .slice(0, Math.max(0, MAX_EXTRA_PAGES - first.length));
    await readExtra(more);
  }
  const uniq = (xs) => [...new Set(xs)];
  const all = (k) => pages.flatMap((p) => p[k]);
  const ld = fromJsonLd(pages.flatMap((p) => p.jsonLd));
  const prices = [];
  const seen = new Set();
  for (const p of all("prices")) {
    const key = p.name.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      prices.push(p);
    }
  }
  const faqs = [];
  for (const f of all("faqs")) if (!faqs.some((x) => x.q.toLowerCase() === f.q.toLowerCase())) faqs.push(f);
  // The static and browser copies of a page overlap; keep the richer one per URL.
  const byUrl = new Map();
  for (const p of pages) {
    const prev = byUrl.get(p.url);
    if (!prev || p.text.length > prev.text.length) byUrl.set(p.url, p);
  }
  const unique = [...byUrl.values()];
  const fullText = unique.map((p) => `## ${p.title || p.url}\n${p.text}`).join("\n\n");
  const last10 = (n) => n.replace(/\D/g, "").slice(-10);
  const dedupeNumbers = (xs) => {
    const out = new Map();
    for (const x of xs) {
      const d = x.replace(/\D/g, "");
      if (d.length < 10) continue;
      const key = last10(x);
      const prev = out.get(key);
      if (!prev || x.replace(/\D/g, "").length > prev.replace(/\D/g, "").length) out.set(key, x);
    }
    return [...out.values()];
  };
  const whatsapp = dedupeNumbers(all("whatsapp"));
  const hasGenericWa = all("whatsapp").some((w) => !/\d{8,}/.test(w));
  const phones = dedupeNumbers([...(ld.phone ? [ld.phone] : []), ...all("phones")]);
  const formSeen = new Set();
  const forms = all("forms").filter((f) => {
    const key = f.fields.join("|").toLowerCase();
    if (formSeen.has(key)) return false;
    formSeen.add(key);
    return true;
  });
  const hoursSeen = new Set();
  // Same schedule written differently ("Mon – Sat" vs "Mon, Tue, …") still counts once if the times match.
  const hours = [...ld.hours.map(prettyHours), ...all("hours")].filter((h) => {
    const key = hoursKey(h);
    if (hoursSeen.has(key)) return false;
    hoursSeen.add(key);
    return true;
  });
  const socialLinks = [];
  for (const l of pages.flatMap((p) => p.socialLinks)) if (!socialLinks.some((x) => x.name === l.name)) socialLinks.push(l);
  const services = uniq(unique.flatMap((p) => p.headings))
    .filter((h) => !/contact|about|faq|question|price|welcome|home|follow|hours|visit|menu|©|testimonial|review|blog|gallery|team/i.test(h))
    .slice(0, 16);
  return {
    url: base.toString(),
    name: (!brokenName(ld.name) && ld.name) || guessName(pages[0], base.hostname),
    description: pages.map((p) => p.description).find(Boolean) ?? "",
    businessType: detectBusinessType(fullText),
    pages: unique.map((p) => ({ url: p.url, title: p.title })),
    prices: prices.slice(0, 40),
    faqs: faqs.slice(0, 20),
    hours: hours.slice(0, 6),
    address: dedupeParts(ld.address || pages.map((p) => p.address).find(Boolean) || ""),
    phones: phones.slice(0, 4),
    emails: uniq(all("emails")).slice(0, 4),
    whatsapp: whatsapp.length ? whatsapp.slice(0, 3) : hasGenericWa ? ["WhatsApp link"] : [],
    forms: forms.slice(0, 6),
    embeds: uniq(all("embeds")),
    socials: uniq(all("socials")),
    socialLinks,
    mapUrl: pages.map((p) => p.mapUrl).find(Boolean) ?? "",
    rendered: renders > 0,
    signals: mergeSignals(pages.filter((p) => p.url === pages[0].url || p.url === base.toString()).map((p) => p.signals)),
    services,
    content: mergeContent(unique, base),
    text: fullText.slice(0, 24000),
  };
}
/** The homepage leads (headline, logo, brand); every page adds sections, reviews and photos. */
function mergeContent(pages, base) {
  const home = pages.find((p) => p.url === base.toString()) ?? pages[0];
  const h = home.content;
  const aboutPage = pages.find((p) => /about|story|who-we-are|our-team/i.test(new URL(p.url).pathname) && p.content.about.length);
  const firstOf = (pick, ok) => [h, ...pages.map((p) => p.content)].map(pick).find(ok);
  const uniqBy = (xs, key) => xs.filter((x, i) => xs.findIndex((y) => key(y) === key(x)) === i);
  return {
    headline: h.headline,
    subheadline: h.subheadline,
    about: (aboutPage?.content.about.length ? aboutPage.content.about : h.about).slice(0, 4),
    sections: uniqBy(
      [h, ...pages.filter((p) => p !== home).map((p) => p.content)].flatMap((c) => c.sections),
      (s) => s.heading.toLowerCase(),
    ).slice(0, 12),
    testimonials: uniqBy(
      pages.flatMap((p) => p.content.testimonials),
      (t) => t.quote,
    ).slice(0, 8),
    nav: h.nav,
    ctas: h.ctas,
    logo: firstOf((c) => c.logo, Boolean) ?? "",
    favicon: firstOf((c) => c.favicon, Boolean) ?? "",
    ogImage: firstOf((c) => c.ogImage, Boolean) ?? "",
    themeColor: firstOf((c) => c.themeColor, Boolean) ?? "",
    images: uniqBy(
      [h, ...pages.map((p) => p.content)].flatMap((c) => c.images),
      (i) => i.src,
    ).slice(0, 16),
  };
}
/** "Tuesday to Sunday, 10:00 am to 8:30 pm" and "Tue-Sun 10:00 am – 8:30 pm" produce the same key. */
function hoursKey(h) {
  return h
    .toLowerCase()
    .replace(/\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/g, "$1")
    .replace(/\b(open|opening|hours|timings?|daily|we are)\b/g, "")
    .replace(/([a-z])\s*:/g, "$1")
    .replace(/\s*(?:to|–|-|—)\s*/g, "-")
    .replace(/(\d)(?::00)?\s*(am|pm)/g, "$1$2")
    .replace(/[^a-z0-9:-]/g, "");
}
function dedupeParts(addr) {
  const seen = new Set();
  return addr
    .split(/\s*,\s*/)
    .filter((part) => {
      const key = part.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(", ");
}
function mergeSignals(list) {
  // Page structure comes from the fullest copy (the browser one, for JavaScript-built sites).
  const first = [...list].sort((a, b) => b.wordCount - a.wordCount)[0];
  return list.reduce(
    (acc, s) => ({
      ...acc,
      contactLinks: Math.max(acc.contactLinks ?? 0, s.contactLinks ?? 0),
      https: acc.https || s.https,
      viewport: acc.viewport || s.viewport,
      title: acc.title || s.title,
      h1: acc.h1 || s.h1,
      metaDescription: acc.metaDescription || s.metaDescription,
      jsonLdTypes: [...new Set([...acc.jsonLdTypes, ...s.jsonLdTypes])],
      ctaCount: Math.max(acc.ctaCount, s.ctaCount),
      ogImage: acc.ogImage || s.ogImage,
      wordCount: Math.max(acc.wordCount, s.wordCount),
    }),
    first,
  );
}
const DAYS = { Mo: "Mon", Tu: "Tue", We: "Wed", Th: "Thu", Fr: "Fri", Sa: "Sat", Su: "Sun" };
function prettyHours(h) {
  return h.replace(/\b(Mo|Tu|We|Th|Fr|Sa|Su)\b/g, (d) => DAYS[d]).replace(/,/g, ", ");
}
/* ----------------------------------------------------------------- entry */
export async function crawl(input, log) {
  const handle = instagramHandle(input);
  return handle ? crawlInstagram(handle, log) : crawlSite(input, log);
}
async function crawlInstagram(handle, log) {
  log("info", `Opening Instagram profile @${handle}`);
  const ig = await readInstagram(handle);
  if (!ig) {
    throw new CrawlError(
      `Couldn't open @${handle} on Instagram. The profile may be private or missing, or Instagram asked for a login. Try the business's name or website instead.`,
    );
  }
  log("ok", `Found ${ig.name} (@${handle})${ig.followers ? ` · ${ig.followers} followers` : ""}${ig.posts ? ` · ${ig.posts} posts` : ""}`);
  if (ig.bio) log("ok", `Bio: ${ig.bio.replace(/\s+/g, " ").slice(0, 90)}`);
  let k = null;
  if (ig.link && !NOT_A_WEBSITE.test(ig.link)) {
    const host = (() => {
      try {
        return new URL(ig.link).hostname;
      } catch {
        return ig.link;
      }
    })();
    log("info", LINK_HUBS.test(ig.link) ? `Opening the link page in bio: ${host}` : `Following the website in bio: ${host}`);
    try {
      k = await crawlSite(ig.link, log);
    } catch (e) {
      log("warn", `Couldn't read the link in bio${e instanceof CrawlError ? ` (${e.message})` : ""}. Using the Instagram profile only.`);
    }
  } else if (!ig.link) {
    log("warn", "No website in the bio, so the scan uses the Instagram profile only.");
  }
  const bioText = `${ig.name}\n${ig.bio}`;
  const bioPhones = (ig.bio.match(PHONE_RE) ?? []).map(digitsOnly);
  const bioEmails = (ig.bio.match(EMAIL_RE) ?? []).map((e) => e.toLowerCase());
  const linkWa = ig.link ? whatsappNumber(ig.link) : null;
  const bioHasWa = /whats\s?app|\bwa\b/i.test(ig.bio);
  k ??= {
    url: ig.url,
    name: ig.name,
    description: ig.bio,
    businessType: detectBusinessType(bioText),
    pages: [{ url: ig.url, title: `${ig.name} on Instagram` }],
    prices: [],
    faqs: [],
    hours: [],
    address: "",
    phones: [],
    emails: [],
    whatsapp: [],
    forms: [],
    embeds: [],
    socials: [],
    socialLinks: [],
    mapUrl: "",
    rendered: true,
    services: [],
    text: bioText,
  };
  const last10 = (n) => n.replace(/\D/g, "").slice(-10);
  const addNum = (list, n) => {
    if (n.replace(/\D/g, "").length >= 10 && !list.some((x) => last10(x) === last10(n))) list.push(n);
  };
  for (const p of bioPhones) addNum(k.phones, p);
  if (linkWa && /\d{8,}/.test(linkWa)) addNum(k.whatsapp, linkWa);
  else if (bioHasWa) for (const p of bioPhones) addNum(k.whatsapp, p);
  for (const e of bioEmails) if (!k.emails.includes(e)) k.emails.push(e);
  if (!k.socials.includes("Instagram")) k.socials.unshift("Instagram");
  if (!k.socialLinks.some((l) => l.name === "Instagram")) k.socialLinks.unshift({ name: "Instagram", url: ig.url });
  k.description ||= ig.bio;
  if (k.businessType === "services") k.businessType = detectBusinessType(`${bioText}\n${k.text}`);
  k.text = `## Instagram @${handle}\n${bioText}\n\n${k.text}`.slice(0, 24000);
  k.instagram = { handle, url: ig.url, followers: ig.followers, posts: ig.posts, bio: ig.bio, link: ig.link };
  return k;
}
