import "server-only";
import * as cheerio from "cheerio";
import { CrawlError, DEMO_URL, fetchPage } from "./crawl";
import { renderPage } from "./render";
import type { DeployedAgent } from "./store";

/**
 * The business's own website, served from Weblyy so it runs with working buttons:
 *  - "original": the page exactly as it is (only links are pointed back through Weblyy so navigation stays here)
 *  - "enhanced": the same page with Weblyy add-ons written into its code. Nothing of the site is removed or restyled;
 *    everything added sits in its own layer (a Shadow DOM script and extra <head> data).
 */

export type Mode = "original" | "enhanced";
export const MODES: Mode[] = ["original", "enhanced"];

const DEMO_HOST = new URL(DEMO_URL).hostname;
const TTL = 15 * 60_000;
const MAX_PAGES = 8;

interface Cached {
  at: number;
  url: string;
  html: string;
  spa: boolean;
}
const g = globalThis as unknown as { __weblyyMirror?: Map<string, Cached> };
const cache = (g.__weblyyMirror ??= new Map<string, Cached>());

export function siteOrigin(agent: DeployedAgent): URL | null {
  const raw = agent.knowledge.url;
  if (!raw || /instagram\.com/i.test(raw)) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "http:" || u.protocol === "https:" ? new URL(u.origin) : null;
  } catch {
    return null;
  }
}

/** Where the page's own relative files (CSS, images, scripts) load from. */
function assetBase(pageUrl: URL, appOrigin: string) {
  if (pageUrl.hostname === DEMO_HOST) {
    const file = pageUrl.pathname.replace(/^\/+/, "");
    const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/") + 1) : "";
    return `${appOrigin}/demo/kesar/${dir}`;
  }
  return pageUrl.toString();
}

const visibleText = (html: string) =>
  cheerio
    .load(html)("body")
    .text()
    .replace(/\s+/g, " ")
    .trim().length;

/** Fetches one page of the business site (cached). Falls back to a real browser for JavaScript-built sites. */
export async function loadPage(target: URL): Promise<Cached> {
  const key = target.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit;

  let page: { url: URL; html: string } | null = null;
  let spa = false;
  let firstError: unknown = null;
  try {
    page = await fetchPage(target);
  } catch (e) {
    firstError = e;
  }
  // An empty shell (React/Vue site) or a blocked request: take what a real browser sees instead.
  if (target.hostname !== DEMO_HOST && (!page || visibleText(page.html) < 150)) {
    const r = await renderPage(target.toString(), 20_000, 1).catch(() => null);
    if (r && visibleText(r.html) >= 150) {
      page = { url: new URL(r.url), html: r.html };
      spa = true;
    }
  }
  if (!page) throw firstError instanceof Error ? firstError : new CrawlError("Couldn't open that page.");
  const entry: Cached = { at: Date.now(), url: page.url.toString(), html: page.html, spa };
  if (cache.size > 300) cache.clear();
  cache.set(key, entry);
  return entry;
}

/** Same-site pages linked from the homepage, for the "reading every page" step. */
export function internalLinks(html: string, pageUrl: string, origin: URL): URL[] {
  const $ = cheerio.load(html);
  const seen = new Set<string>();
  const out: URL[] = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (/^(#|mailto:|tel:|javascript:|whatsapp:)/i.test(href)) return;
    let u: URL;
    try {
      u = new URL(href, pageUrl);
    } catch {
      return;
    }
    if (u.origin !== origin.origin || /\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|docx?)$/i.test(u.pathname)) return;
    u.hash = "";
    const k = u.pathname + u.search;
    if (seen.has(k) || k === new URL(pageUrl).pathname) return;
    seen.add(k);
    out.push(u);
  });
  return out.slice(0, MAX_PAGES - 1);
}

export function mirrorPath(agentId: string, mode: Mode, target: URL, origin: URL) {
  const rest = target.origin === origin.origin ? target.pathname.replace(/^\/+/, "") : "";
  return `/mirror/${agentId}/${mode}/${rest}${target.search}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

export interface TransformOptions {
  agent: DeployedAgent;
  mode: Mode;
  pageUrl: URL;
  origin: URL;
  appOrigin: string;
  spa: boolean;
  highlight: boolean;
}

/** The page's own code with navigation kept inside Weblyy, plus (enhanced mode) the Weblyy add-ons. */
export function transform(html: string, o: TransformOptions): { html: string; added: string[] } {
  const $ = cheerio.load(html);
  const added: string[] = [];
  const head = $("head").length ? $("head") : $("html").prepend("<head></head>").find("head");

  // Their files keep loading from their own site.
  $("base").remove();
  head.prepend(`<base href="${esc(assetBase(o.pageUrl, o.appOrigin))}">`);
  // A page-level security policy would block the preview's own helpers; the live site keeps its own.
  $('meta[http-equiv="Content-Security-Policy" i], meta[http-equiv="content-security-policy"]').remove();

  // A JavaScript-built page was captured from a real browser: re-running its scripts would rebuild (or blank) it.
  if (o.spa) $('script:not([type="application/ld+json"])').remove();

  // Links to other pages of the same site stay inside the preview.
  $("a[href], area[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (/^(#|mailto:|tel:|javascript:|sms:|whatsapp:)/i.test(href)) return;
    let u: URL;
    try {
      u = new URL(href, o.pageUrl);
    } catch {
      return;
    }
    if (u.origin !== o.origin.origin) {
      $(el).attr("target", "_blank").attr("rel", "noopener noreferrer");
      return;
    }
    if (/\.(pdf|jpe?g|png|gif|webp|svg|zip|mp4|docx?)$/i.test(u.pathname)) {
      $(el).attr("href", o.pageUrl.hostname === DEMO_HOST ? new URL(u.pathname.replace(/^\/+/, ""), `${o.appOrigin}/demo/kesar/`).toString() : u.toString());
      return;
    }
    $(el).attr("href", `${o.appOrigin}${mirrorPath(o.agent.id, o.mode, u, o.origin)}${u.hash}`).removeAttr("target");
  });

  if (o.mode === "enhanced") {
    const k = o.agent.knowledge;
    const search = o.agent.workspace?.search;

    // Google and AI assistants: only filled in where the site has nothing.
    if (search) {
      if (!$('meta[name="description" i]').attr("content")) {
        head.append(`<meta name="description" content="${esc(search.metaDescription)}">`);
        added.push("meta-description");
      }
      const hasLocal = $('script[type="application/ld+json"]')
        .toArray()
        .some((s) => /LocalBusiness|Dentist|Salon|Clinic|Restaurant|Store|Organization/i.test($(s).html() ?? ""));
      const ld = hasLocal ? search.jsonLd.filter((j) => j["@type"] === "FAQPage") : search.jsonLd;
      if (ld.length) {
        head.append(ld.map((j) => `<script type="application/ld+json">${JSON.stringify(j).replace(/</g, "\\u003c")}</script>`).join(""));
        added.push("structured-data");
      }
    }

    const phone = (k.phones[0] ?? "").replace(/[^\d+]/g, "");
    const wa = (k.whatsapp[0] ?? k.phones[0] ?? "").replace(/\D/g, "");
    const services = [...new Set([...k.prices.map((p) => p.name), ...k.services])].slice(0, 12);
    const cfg = {
      agent: o.agent.id,
      name: k.name,
      phone,
      whatsapp: wa.length === 10 ? `91${wa}` : wa,
      services,
      hours: k.hours[0] ?? "",
      highlight: o.highlight,
    };
    $("body").append(
      `<script src="${o.appOrigin}/widget.js" data-agent="${esc(o.agent.id)}" async></script>` +
        `<script src="${o.appOrigin}/weblyy-addons.js" data-config="${esc(JSON.stringify(cfg))}" async></script>`,
    );
    added.push("ai-assistant", "quick-actions", "booking-form");
  }

  return { html: $.html(), added };
}
