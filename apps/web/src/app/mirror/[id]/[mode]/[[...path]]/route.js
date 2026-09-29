import { CrawlError } from "@/lib/crawl";
import { loadPage, MODES, siteOrigin, transform } from "@/lib/mirror";
import { getAgent } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const page = (title, body, status) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>` +
      `<body style="margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;font:16px/1.5 system-ui,sans-serif;background:#f7f8fa;color:#111827;text-align:center">` +
      `<div style="max-width:420px"><div style="font-size:40px">🌐</div><h1 style="font-size:20px;margin:10px 0 6px">${title}</h1><p style="color:#4b5563;margin:0">${body}</p></div></body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "x-robots-tag": "noindex" } },
  );
const escHtml = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
/** Serves a page of the business's own site through Weblyy: as it is, or with the Weblyy add-ons written in. */
export async function GET(req, ctx) {
  const { id, mode, path } = await ctx.params;
  if (!MODES.includes(mode)) return page("Page not found", "This preview link isn't right.", 404);
  const agent = await getAgent(id);
  if (!agent) return page("Preview not found", "This business isn't on Weblyy anymore. Analyze the website again.", 404);
  const origin = siteOrigin(agent);
  if (!origin) return page("No website to show", "This business only has an Instagram profile, so there is no existing website to copy.", 404);
  const req0 = new URL(req.url);
  const highlight = req0.searchParams.get("wb_highlight") === "1";
  req0.searchParams.delete("wb_highlight");
  // Only paths on the business's own site: this is never a proxy to anywhere else.
  const clean = (path ?? []).map((p) => encodeURIComponent(decodeURIComponent(p))).join("/");
  const target = new URL(`/${clean}${req0.search}`, origin);
  try {
    const got = await loadPage(target);
    const { html } = transform(got.html, {
      agent,
      mode: mode,
      pageUrl: new URL(got.url),
      origin,
      appOrigin: req0.origin,
      spa: got.spa,
      highlight,
    });
    return new Response(html, {
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex", "referrer-policy": "no-referrer" },
    });
  } catch (e) {
    const why = e instanceof CrawlError ? e.message : "The website didn't answer in time.";
    if (!(e instanceof CrawlError)) console.error("[mirror]", target.toString(), e);
    return page(
      "Couldn't open this page",
      `${escHtml(why)} <a href="${escHtml(target.toString())}" target="_blank" rel="noopener">Open it on the real website</a>.`,
      502,
    );
  }
}
