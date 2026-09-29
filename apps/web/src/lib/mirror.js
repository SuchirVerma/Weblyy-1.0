import "server-only";
import * as cheerio from "cheerio";
import { CrawlError, DEMO_URL, fetchPage } from "./crawl";
import { profileOf } from "./profiles";
import { renderPage } from "./render";
export const MODES = ["original", "enhanced"];
const DEMO_HOST = new URL(DEMO_URL).hostname;
const TTL = 15 * 60_000;
const MAX_PAGES = 8;
const g = globalThis;
const cache = (g.__weblyyMirror ??= new Map());
export function siteOrigin(agent) {
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
function assetBase(pageUrl, appOrigin) {
  if (pageUrl.hostname === DEMO_HOST) {
    const file = pageUrl.pathname.replace(/^\/+/, "");
    const dir = file.includes("/") ? file.slice(0, file.lastIndexOf("/") + 1) : "";
    return `${appOrigin}/demo/kesar/${dir}`;
  }
  return pageUrl.toString();
}
const visibleText = (html) => cheerio.load(html)("body").text().replace(/\s+/g, " ").trim().length;
/** Fetches one page of the business site (cached). Falls back to a real browser for JavaScript-built sites. */
export async function loadPage(target) {
  const key = target.toString();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit;
  let page = null;
  let spa = false;
  let firstError = null;
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
  const entry = { at: Date.now(), url: page.url.toString(), html: page.html, spa };
  if (cache.size > 300) cache.clear();
  cache.set(key, entry);
  return entry;
}
/** Same-site pages linked from the homepage, for the "reading every page" step. */
export function internalLinks(html, pageUrl, origin) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const out = [];
  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") ?? "";
    if (/^(#|mailto:|tel:|javascript:|whatsapp:)/i.test(href)) return;
    let u;
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
export function mirrorPath(agentId, mode, target, origin) {
  const rest = target.origin === origin.origin ? target.pathname.replace(/^\/+/, "") : "";
  return `/mirror/${agentId}/${mode}/${rest}${target.search}`;
}
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
/** The page's own code with navigation kept inside Weblyy, plus (enhanced mode) the Weblyy add-ons. */
export function transform(html, o) {
  const $ = cheerio.load(html);
  const added = [];
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
    let u;
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
    $(el)
      .attr("href", `${o.appOrigin}${mirrorPath(o.agent.id, o.mode, u, o.origin)}${u.hash}`)
      .removeAttr("target");
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
    const profile = profileOf(k);
    const assistant = profile.agent.mode === "full";
    const mapQuery = k.address ? `${k.name} ${k.address}` : "";
    const cfg = {
      agent: o.agent.id,
      goal: { id: profile.goal.id, title: profile.goal.title, cta: profile.goal.cta, short: profile.goal.short, fields: profile.goal.fields },
      quick: profile.quick,
      map: k.mapUrl || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : ""),
      assistant,
      name: k.name,
      phone,
      whatsapp: wa.length === 10 ? `91${wa}` : wa,
      services,
      hours: k.hours[0] ?? "",
      highlight: o.highlight,
    };
    // The chat assistant only goes where customers ask a lot before buying (salons, clinics, coaching, gyms).
    $("body").append(
      (assistant ? `<script src="${o.appOrigin}/widget.js" data-agent="${esc(o.agent.id)}" async></script>` : "") +
        `<script src="${o.appOrigin}/weblyy-addons.js" data-config="${esc(JSON.stringify(cfg))}" async></script>`,
    );
    added.push(...(assistant ? ["ai-assistant"] : []), "quick-actions", `${profile.goal.id}-form`);
  }
  return { html: $.html(), added };
}
