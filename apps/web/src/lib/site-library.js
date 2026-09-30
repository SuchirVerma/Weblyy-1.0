import "server-only";
import * as cheerio from "cheerio";
import { crawl, extractPage, fetchPage } from "./crawl";
import { flushAgent, getAgent } from "./store";
/**
 * The assistant's own copy of the business's website: many more pages than the scan reads, kept up to date.
 * The scan reads a handful of pages to score the site; the assistant needs everything a customer might ask about.
 */
const MAX_PAGES = 30;
const PAGE_TEXT = 4000;
const BUDGET_MS = 40_000;
const STALE_MS = 24 * 60 * 60_000;
const SKIP = /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|mp3|docx?|xlsx?|pptx?)(\?|$)|login|signin|sign-in|register|cart|checkout|account|wp-admin|wp-login|privacy|terms|cookie|feed|\/tag\/|\/author\/|mailto:|tel:|javascript:/i;
const FIRST = /price|pricing|rate|menu|service|treatment|about|faq|fee|admission|course|package|contact|doctor|team|faculty|facilit|product|program|class|offer|review|testimonial|rules?|uniform|transport|bus|timing|hours|holiday|calendar|policy|eligib|curriculum|infrastructure|amenit|location|branch/i;
// Pages customers rarely ask about, and that have little text to answer from.
const LAST = /gallery|photo|album|video|news|blog|events?|vacanc|career|job|moment|author|recommend|download|circular|press|quiz|word-of|word of|resources|links|know-your|know your/i;

export const isStale = (k) => !k.library || Date.now() - (k.library.at ?? 0) > STALE_MS;

/** Reads up to MAX_PAGES pages of the site (plain HTML, no browser, so it stays fast), most useful pages first. */
export async function readLibrary(url, { maxPages = MAX_PAGES, budgetMs = BUDGET_MS } = {}) {
  const deadline = Date.now() + budgetMs;
  let start;
  try {
    start = new URL(url);
  } catch {
    return null;
  }
  if (/instagram\.com$/i.test(start.hostname.replace(/^www\./, ""))) return null;
  const host = start.hostname.replace(/^www\./, "");
  const seen = new Set();
  const queue = [{ href: start.toString(), score: 10 }];
  const pages = [];
  const key = (u) => u.replace(/#.*$/, "").replace(/\/$/, "").replace(/^https?:\/\/(www\.)?/i, "");
  // Spread the reading across topics: ten "admission-class-…" pages shouldn't crowd out "school-rules" and "uniform".
  const topic = (href) => {
    try {
      return new URL(href).pathname.toLowerCase().split(/[/_.-]+/).filter(Boolean)[0] ?? "";
    } catch {
      return "";
    }
  };
  const perTopic = new Map();
  const rank = (l) => l.score - 0.35 * (perTopic.get(topic(l.href)) ?? 0);
  while (queue.length && pages.length < maxPages && Date.now() < deadline) {
    queue.sort((a, b) => rank(b) - rank(a));
    const batch = queue.splice(0, 4).filter((l) => !seen.has(key(l.href)));
    batch.forEach((l) => seen.add(key(l.href)));
    const got = await Promise.all(
      batch.map(async (l) => {
        try {
          const res = await fetchPage(new URL(l.href));
          return { ...extractPage(res.url, res.html), mainText: mainText(res.html) };
        } catch {
          return null;
        }
      }),
    );
    for (const p of got) {
      if (!p || pages.length >= maxPages) continue;
      seen.add(key(p.url));
      perTopic.set(topic(p.url), (perTopic.get(topic(p.url)) ?? 0) + 1);
      pages.push({
        url: p.url,
        title: pageName(p),
        text: (p.mainText || p.text).slice(0, PAGE_TEXT),
        sections: (p.content?.sections ?? []).slice(0, 8),
        faqs: p.faqs.slice(0, 12),
        prices: p.prices.slice(0, 30),
      });
      // All links, not just same-hostname ones: many sites mix "site.com" and "www.site.com".
      const text = new Map((p.internal ?? []).map((l) => [l.href, l.text]));
      for (const href of p.links ?? []) {
        let u;
        try {
          u = new URL(href, p.url);
        } catch {
          continue;
        }
        if (u.protocol !== "http:" && u.protocol !== "https:") continue;
        u.hash = "";
        const l = { text: text.get(u.href) ?? "" };
        if (u.hostname.replace(/^www\./, "") !== host || SKIP.test(u.href) || seen.has(key(u.href))) continue;
        if (queue.some((q) => key(q.href) === key(u.href))) continue;
        const words = `${u.pathname} ${l.text ?? ""}`;
        queue.push({ href: u.href, score: FIRST.test(words) ? 2 : LAST.test(words) ? 0 : 1 });
      }
    }
  }
  return pages.length ? { at: Date.now(), pages } : null;
}

/** The page's own words: menus, headers, footers and sidebars repeat on every page and would match every question. */
function mainText(html) {
  const $ = cheerio.load(html);
  $("script, style, noscript, svg, iframe, nav, header, footer, aside, form, [role=navigation], [role=banner], [role=contentinfo]").remove();
  $("[class*=menu], [id*=menu], [class*=navbar], [class*=breadcrumb], [class*=footer], [id*=footer], [class*=header], [id*=header], [class*=sidebar]").remove();
  // Block elements end sentences, so "Admissions" in one box and "Class XI" in the next don't run together.
  $("p, li, h1, h2, h3, h4, h5, h6, td, th, div, br, section, article").each((_, el) => {
    $(el).append(" \n");
  });
  const root = $("main").length ? $("main") : $("body");
  return root
    .text()
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 2)
    .join("\n");
}
/** "Dental Implants in Delhi | Kalra Dental" → "Dental Implants in Delhi". */
function pageName(p) {
  let path = "/";
  try {
    path = new URL(p.url).pathname;
  } catch {}
  if (path === "/" || path === "") return "Home";
  const t = (p.title || "").split(/\s[|\-–—]\s/)[0].trim();
  if (t && t.length <= 50) return t;
  const slug = path.split("/").filter(Boolean).pop() ?? "";
  return slug.replace(/[-_]+/g, " ").replace(/\.\w+$/, "").replace(/^\w/, (c) => c.toUpperCase()) || "Website";
}

/**
 * Re-reads the business's website and refreshes what the assistant knows: prices, hours, contacts and every page.
 * Loads the latest copy of the agent before saving, so chats that arrived meanwhile are never overwritten.
 */
export async function refreshAgentKnowledge(agentId) {
  const a = await getAgent(agentId);
  if (!a) return false;
  const url = a.knowledge.url;
  const [fresh, library] = await Promise.all([
    crawl(url, () => {}).catch(() => null),
    readLibrary(url).catch(() => null),
  ]);
  const latest = await getAgent(agentId);
  if (!latest) return false;
  const next = { ...latest.knowledge };
  if (fresh) {
    // Keep the name the owner already sees; everything else comes from the site as it is today.
    for (const f of ["prices", "faqs", "hours", "address", "phones", "emails", "whatsapp", "services", "socialLinks", "mapUrl", "description", "text", "content", "pages"]) {
      if (fresh[f] !== undefined) next[f] = fresh[f];
    }
  }
  next.library = library ?? { ...(latest.knowledge.library ?? {}), at: Date.now(), pages: latest.knowledge.library?.pages ?? [] };
  delete next.library.refreshingAt;
  latest.knowledge = next;
  await flushAgent(agentId);
  return true;
}

/** Marks a refresh as running, so a burst of chats starts one re-read, not twenty. */
export async function claimRefresh(agent) {
  if (!isStale(agent.knowledge)) return false;
  const lib = agent.knowledge.library;
  if (lib?.refreshingAt && Date.now() - lib.refreshingAt < 10 * 60_000) return false;
  agent.knowledge.library = { ...(lib ?? { pages: [] }), refreshingAt: Date.now() };
  await flushAgent(agent.id);
  return true;
}

/** Right after an assistant is created: read the rest of the site so the first customer already gets full answers. */
export async function attachLibrary(agentId) {
  const a = await getAgent(agentId);
  if (!a) return;
  const library = await readLibrary(a.knowledge.url).catch(() => null);
  if (!library) return;
  const latest = await getAgent(agentId);
  if (!latest) return;
  latest.knowledge = { ...latest.knowledge, library };
  await flushAgent(agentId);
}
