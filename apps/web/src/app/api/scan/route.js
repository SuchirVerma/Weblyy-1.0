import { capturePage } from "@/lib/capture";
import { crawl, CrawlError, DEMO_URL } from "@/lib/crawl";
import { internalOrigin } from "@/lib/makeover-run";
import { detectTouchpoints, findGaps } from "@/lib/detect";
import { findWebPresence } from "@/lib/presence";
import { allow, clientIp } from "@/lib/ratelimit";
import { saveScan } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
const pause = (ms) => new Promise((r) => setTimeout(r, ms));
export async function POST(req) {
  let url = "";
  try {
    const body = await req.json();
    url = typeof body?.url === "string" ? body.url.slice(0, 300) : "";
  } catch {
    return Response.json({ error: "Send a JSON body with a url." }, { status: 400 });
  }
  if (!allow(`scan:${clientIp(req)}`, 12, 60_000)) {
    return Response.json({ error: "Too many scans. Give it a minute." }, { status: 429 });
  }
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const send = (e) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          closed = true;
        }
      };
      try {
        send({ type: "stage", stage: "crawl" });
        // Keep the log moving during the slower browser step so it never looks stuck.
        let lastLog = Date.now();
        const HEARTBEATS = [
          "Still reading the page like a customer would…",
          "Looking for chat buttons, booking widgets and forms…",
          "Collecting prices, timings and FAQs…",
          "Almost there…",
        ];
        let beat = 0;
        const hb = setInterval(() => {
          if (Date.now() - lastLog > 2500 && beat < HEARTBEATS.length) {
            send({ type: "log", level: "info", text: HEARTBEATS[beat++] });
            lastLog = Date.now();
          }
        }, 1000);
        const knowledge = await crawl(url, (level, text) => {
          lastLog = Date.now();
          send({ type: "log", level, text });
        }).finally(() => clearInterval(hb));
        // Open the site like a customer would, on a laptop and a phone, while the rest of the scan carries on.
        const own = internalOrigin(req);
        const captureStart = Date.now();
        const isDemo = knowledge.url === DEMO_URL;
        const capturing = /instagram\.com/.test(knowledge.url)
          ? Promise.resolve(null)
          : Promise.race([
              capturePage(isDemo ? `${own}/demo/kesar/index.html` : knowledge.url, { allowOrigin: isDemo ? own : undefined })
                .then((c) => {
                  console.info(`[capture] ${knowledge.url}: ${c ? "done" : "no browser"} in ${Date.now() - captureStart} ms`);
                  return c;
                })
                .catch((e) => {
                  console.error(`[capture] ${knowledge.url} failed:`, e instanceof Error ? e.message : e);
                  return null;
                }),
              // A serverless function starts Chromium cold, so it gets longer than a laptop.
              pause(process.env.VERCEL ? 80_000 : 40_000).then(() => {
                console.warn(`[capture] ${knowledge.url}: gave up after ${Date.now() - captureStart} ms`);
                return null;
              }),
            ]);
        send({ type: "stage", stage: "extract" });
        await pause(250);
        send({ type: "log", level: "ok", text: `Business identified: ${knowledge.name} (${knowledge.businessType})` });
        if (knowledge.prices.length) send({ type: "log", level: "ok", text: `Found price list: ${knowledge.prices.length} items` });
        if (knowledge.faqs.length) send({ type: "log", level: "ok", text: `Found ${knowledge.faqs.length} FAQ answers` });
        if (knowledge.hours.length) send({ type: "log", level: "ok", text: `Opening hours: ${knowledge.hours[0].slice(0, 50)}` });
        if (knowledge.address) send({ type: "log", level: "ok", text: `Address found` });
        await pause(200);
        send({ type: "stage", stage: "detect" });
        const touchpoints = detectTouchpoints(knowledge);
        for (const t of touchpoints) {
          send({ type: "touchpoint", touchpoint: t });
          send({ type: "log", level: "ok", text: `${t.label}: ${t.detail}` });
          await pause(130);
        }
        const gaps = findGaps(knowledge);
        for (const g of gaps.slice(0, 3)) {
          send({ type: "log", level: "warn", text: g });
          await pause(100);
        }
        if (touchpoints.length === 0)
          send({ type: "log", level: "warn", text: "No customer touchpoints found. The site may load its content with JavaScript." });
        // Web search: where else does this business show up? Capped so a slow engine can't stall the scan.
        const presence = await Promise.race([
          findWebPresence(knowledge, (text) => send({ type: "log", level: "info", text })).catch(() => null),
          pause(20_000).then(() => null),
        ]);
        if (!presence) {
          if (!/\.demo$/.test(new URL(knowledge.url).hostname)) send({ type: "log", level: "warn", text: "Web search didn't answer in time. Skipping it." });
        } else if (!presence.searched) {
          send({ type: "log", level: "warn", text: "Search engines didn't respond. Web presence not checked." });
        } else {
          send({
            type: "log",
            level: presence.ownSiteFound ? "ok" : "warn",
            text: presence.ownSiteFound ? "Your website shows up when people search your name" : "Your website doesn't show up when people search your name",
          });
          for (const l of presence.listings.slice(0, 6)) {
            send({ type: "log", level: "ok", text: `Found on ${l.platform}${l.rating ? `: ${l.rating}★${l.reviews ? ` (${l.reviews} reviews)` : ""}` : ""}` });
            await pause(90);
          }
          if (!presence.listings.length) send({ type: "log", level: "warn", text: "Not found on Google Maps, Justdial or other directories" });
        }
        const capture = await capturing;
        if (capture) {
          send({ type: "log", level: "ok", text: `Screenshots taken on a laptop and a phone` });
          if (capture.mobile?.overflowX) send({ type: "log", level: "warn", text: "On a phone the page scrolls sideways" });
          if (capture.desktop)
            send({
              type: "log",
              level: capture.desktop.loadMs < 3000 ? "ok" : "warn",
              text: `Homepage loaded in ${(capture.desktop.loadMs / 1000).toFixed(1)} s`,
            });
          if (capture.brand.colors[0])
            send({
              type: "log",
              level: "ok",
              text: `Brand colour ${capture.brand.colors[0]}${capture.brand.headingFont ? `, font ${capture.brand.headingFont}` : ""}`,
            });
        }
        const result = { knowledge, touchpoints, gaps, presence, capture };
        send({ type: "stage", stage: "done" });
        // The rendered HTML stays on the server; the browser only needs the measurements.
        send({ type: "result", scanId: await saveScan(result), result: { ...result, capture: capture && { ...capture, html: "" } } });
      } catch (e) {
        const message = e instanceof CrawlError ? e.message : "Something went wrong while scanning. Try again or use the demo.";
        if (!(e instanceof CrawlError)) console.error("[scan]", e);
        send({ type: "error", message });
      } finally {
        closed = true;
        try {
          controller.close();
        } catch {
          /* already closed by client */
        }
      }
    },
  });
  return new Response(stream, {
    headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store", "x-accel-buffering": "no" },
  });
}
