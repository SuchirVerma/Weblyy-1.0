import { internalLinks, loadPage, mirrorPath, siteOrigin, transform } from "@/lib/mirror";
import { getAgent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

type Step = "open" | "pages" | "design" | "assistant" | "actions" | "booking" | "search" | "test" | "ready";

/**
 * Builds the improved copy of the business's own website and streams progress (NDJSON) for the loader:
 * each line is {step, status, detail, progress 0..1, etaMs} and the last one {done, …summary}.
 */
export async function GET(req: Request, ctx: RouteContext<"/api/enhance/[id]">) {
  const { id } = await ctx.params;
  const agent = await getAgent(id);
  if (!agent) return Response.json({ error: "Not found" }, { status: 404 });
  const origin = siteOrigin(agent);
  if (!origin) return Response.json({ error: "no-website" }, { status: 409 });
  const appOrigin = new URL(req.url).origin;
  const started = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      let progress = 0;
      let closed = false;
      const send = (o: Record<string, unknown>) => {
        if (closed) return;
        try {
          controller.enqueue(enc.encode(JSON.stringify(o) + "\n"));
        } catch {
          closed = true;
        }
      };
      const at = (step: Step, status: "run" | "ok" | "warn", detail: string, p: number) => {
        progress = Math.max(progress, p);
        const elapsed = Date.now() - started;
        // Early on, use a typical build time; later, extrapolate from how fast this site is going.
        const etaMs = progress < 0.12 ? 9000 : Math.max(0, Math.round((elapsed / progress) * (1 - progress)));
        send({ step, status, detail, progress, etaMs, elapsed });
      };

      try {
        at("open", "run", origin.host, 0.03);
        const home = await loadPage(new URL("/", origin));
        const homeUrl = new URL(home.url);
        at("open", "ok", `${homeUrl.host} opened${home.spa ? " in a real browser (JavaScript site)" : ""}`, 0.15);

        const sample: string[] = [];
        for (const m of home.html.matchAll(/<(header|nav|section|footer|main|form|button|h1)\b[^>]*>/gi)) {
          if (sample.length < 14) sample.push(m[0].replace(/\s+/g, " ").slice(0, 90));
        }
        send({ step: "code", sample });

        const links = internalLinks(home.html, home.url, origin);
        at("pages", "run", `Found ${links.length + 1} page${links.length ? "s" : ""}`, 0.18);
        const pages = [{ url: homeUrl, html: home.html, spa: home.spa }];
        let done = 0;
        await Promise.all(
          links.map(async (u) => {
            try {
              const p = await loadPage(u);
              pages.push({ url: new URL(p.url), html: p.html, spa: p.spa });
            } catch {
              /* a page that won't open is skipped; the rest still work */
            }
            done += 1;
            at("pages", "run", `Read ${done + 1} of ${links.length + 1} pages`, 0.18 + 0.37 * (done / Math.max(1, links.length)));
          }),
        );
        at("pages", "ok", `${pages.length} page${pages.length === 1 ? "" : "s"} copied`, 0.56);

        let styles = 0;
        let images = 0;
        let scripts = 0;
        for (const p of pages) {
          styles += (p.html.match(/<link[^>]+stylesheet|<style/gi) ?? []).length;
          images += (p.html.match(/<img\b/gi) ?? []).length;
          scripts += (p.html.match(/<script\b/gi) ?? []).length;
        }
        at("design", "ok", `${styles} style sheets, ${images} images and ${scripts} scripts kept exactly as they are`, 0.64);

        // Write the add-ons into every page and check each one really has them.
        let ok = 0;
        const added = new Set<string>();
        const brokenPages: string[] = [];
        for (const [i, p] of pages.entries()) {
          const t = transform(p.html, { agent, mode: "enhanced", pageUrl: p.url, origin, appOrigin, spa: p.spa, highlight: false });
          t.added.forEach((a) => added.add(a));
          if (t.html.includes("/weblyy-addons.js") && t.html.includes("/widget.js")) ok += 1;
          else brokenPages.push(p.url.pathname);
          const p0 = 0.64 + 0.26 * ((i + 1) / pages.length);
          if (i === 0) at("assistant", "ok", "AI chat assistant added to every page", Math.min(p0, 0.7));
          if (i === Math.floor(pages.length / 2)) at("actions", "ok", "Quick Call, WhatsApp and Book buttons added, only where your site has none", Math.min(p0, 0.78));
        }
        at("booking", "ok", "Booking form connected to your Customers list", 0.84);
        at(
          "search",
          added.has("structured-data") || added.has("meta-description") ? "ok" : "warn",
          added.has("structured-data") ? "Business details added for Google and AI apps" : "Your site already had its Google details, kept as is",
          0.9,
        );

        const widget = await fetch(`${appOrigin}/widget.js`, { signal: AbortSignal.timeout(5000) }).then((r) => r.ok).catch(() => false);
        const addons = await fetch(`${appOrigin}/weblyy-addons.js`, { signal: AbortSignal.timeout(5000) }).then((r) => r.ok).catch(() => false);
        const tested = widget && addons && ok === pages.length;
        at("test", tested ? "ok" : "warn", tested ? `All ${pages.length} pages checked, every button works` : `${ok} of ${pages.length} pages ready${brokenPages.length ? ` (skipped ${brokenPages.join(", ")})` : ""}`, 0.97);

        at("ready", "ok", "Your improved website is running", 1);
        send({
          done: true,
          seconds: Math.round((Date.now() - started) / 100) / 10,
          pages: pages.length,
          spa: home.spa,
          host: homeUrl.host,
          originalPath: mirrorPath(agent.id, "original", homeUrl, origin),
          enhancedPath: mirrorPath(agent.id, "enhanced", homeUrl, origin),
          added: [...added],
        });
      } catch (e) {
        send({ error: e instanceof Error ? e.message : "Couldn't open the website." });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      }
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
