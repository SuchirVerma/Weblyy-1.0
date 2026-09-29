import "server-only";
import { capturePage } from "./capture";
import { extractPage } from "./crawl";
import { getJSON, setJSON, useRedis } from "./kv";
import { auditSite, factsFor, hasRating, planMakeover, siteBrand, type SiteFacts } from "./makeover";
import type { StoredMakeover } from "./store";
import type { ScanResult } from "./types";

/** Where this server can reach itself. Used to open the redesign preview (and the built-in demo) in the browser. */
export function internalOrigin(req: Request) {
  // On Vercel there's no "this machine"; the page is reached through the public address.
  if (process.env.VERCEL) return new URL(req.url).origin;
  const port = new URL(req.url).port || process.env.PORT || "3000";
  return `http://127.0.0.1:${port}`;
}

const running = ((globalThis as unknown as { __weblyyMakeovers?: Map<string, Promise<StoredMakeover>> }).__weblyyMakeovers ??= new Map());

/**
 * Analyzes the original site, builds the redesign, then measures the redesign with the exact same checks.
 * Runs once per scan; later calls get the same result.
 */
export function ensureMakeover(scanId: string, scan: ScanResult, origin: string): Promise<StoredMakeover> {
  let p = running.get(scanId);
  if (!p) {
    // On Vercel another instance may already have built it.
    p = (useRedis ? getJSON<StoredMakeover>(`makeover:${scanId}`) : Promise.resolve(null)).then(
      (hit) =>
        hit ??
        build(scanId, scan, origin).then(async (m) => {
          if (useRedis) await setJSON(`makeover:${scanId}`, m, 24 * 3600);
          return m;
        }),
    );
    running.set(scanId, p);
    p.catch(() => running.delete(scanId));
    if (running.size > 40) running.delete(running.keys().next().value!);
  }
  return p;
}

async function build(scanId: string, scan: ScanResult, origin: string): Promise<StoredMakeover> {
  const k = scan.knowledge;
  const brand = siteBrand(scan);
  const beforeFacts = factsFor(k, scan.capture, hasRating(scan));

  const previewUrl = `${origin}/preview/${scanId}`;
  const cap = scan.capture ? await capturePage(previewUrl, { allowOrigin: origin }) : null;
  const html = cap?.html || (await fetch(previewUrl, { signal: AbortSignal.timeout(15_000) }).then((r) => r.text()).catch(() => ""));
  if (!html) throw new Error("Couldn't build the redesigned website.");

  // Read the redesign as if it were live at the business's own address.
  const page = extractPage(new URL(k.url), html);
  const afterFacts: SiteFacts = {
    url: k.url,
    signals: { ...page.signals, https: page.signals.https || beforeFacts.signals.https || (process.env.APP_URL ?? "").startsWith("https:") },
    k: {
      prices: page.prices,
      services: page.prices.length ? [] : k.services.filter((s) => html.includes(s.replace(/&/g, "&amp;"))),
      faqs: page.faqs,
      hours: page.hours,
      address: page.address,
      phones: page.phones.filter((p) => p.replace(/\D/g, "").length >= 10),
      whatsapp: page.whatsapp,
      emails: page.emails,
      forms: page.forms,
      embeds: page.embeds,
      socialLinks: page.socialLinks,
      mapUrl: page.mapUrl,
      description: page.description,
    },
    headline: page.content.headline,
    about: page.content.about.length,
    testimonials: page.content.testimonials.length,
    images: new Set([...page.content.images.map((i) => i.src), ...(cap?.brand.images ?? []).map((i) => i.src)]).size,
    logo: Boolean(brand.logo),
    rating: Boolean(brand.rating),
    desktop: cap?.desktop ?? null,
    mobile: cap?.mobile ?? null,
  };

  // Browser-only checks count on both sides only when both sides were measured.
  const before = auditSite(beforeFacts);
  // Load time on this server says nothing about load time on the internet, so it isn't compared until the site is live.
  const comparable = new Set(before.areas.flatMap((a) => a.checks.map((c) => c.id)).filter((id) => id !== "p-load" && id !== "p-mobile"));
  const after = auditSite(afterFacts, comparable);
  const plan = planMakeover(k, scan.capture, before, after, { accent: brand.accent, headingFont: brand.headingFont, bodyFont: brand.bodyFont });
  return { brand, before, after, plan, shots: { before: scan.capture?.shots ?? {}, after: cap?.shots ?? {} } };
}
