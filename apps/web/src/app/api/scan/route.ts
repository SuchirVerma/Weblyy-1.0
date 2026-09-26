import { crawl, CrawlError } from "@/lib/crawl";
import { detectTouchpoints, findGaps } from "@/lib/detect";
import { allow, clientIp } from "@/lib/ratelimit";
import { saveScan } from "@/lib/store";
import type { ScanEvent } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
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
      const send = (e: ScanEvent) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(JSON.stringify(e) + "\n"));
        } catch {
          closed = true;
        }
      };
      try {
        send({ type: "stage", stage: "crawl" });
        const knowledge = await crawl(url, (level, text) => send({ type: "log", level, text }));

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
          await pause(260);
        }
        const gaps = findGaps(knowledge);
        for (const g of gaps.slice(0, 3)) {
          send({ type: "log", level: "warn", text: g });
          await pause(160);
        }
        if (touchpoints.length === 0) send({ type: "log", level: "warn", text: "No customer touchpoints found. The site may load its content with JavaScript." });

        const result = { knowledge, touchpoints, gaps };
        send({ type: "stage", stage: "done" });
        send({ type: "result", scanId: saveScan(result), result });
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
