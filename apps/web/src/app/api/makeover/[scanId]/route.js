import { ensureMakeover, internalOrigin } from "@/lib/makeover-run";
import { allow, clientIp } from "@/lib/ratelimit";
import { getScan } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
/** Website analysis, improvement plan, redesign preview and before/after screenshots for a scan. */
export async function GET(req, ctx) {
  const { scanId } = await ctx.params;
  const scan = await getScan(scanId);
  if (!scan) return Response.json({ error: "This scan expired. Please analyze the website again." }, { status: 404 });
  if (!allow(`makeover:${clientIp(req)}`, 20, 60_000)) return Response.json({ error: "Too many requests. Give it a minute." }, { status: 429 });
  try {
    const m = await ensureMakeover(scanId, scan, internalOrigin(req));
    return Response.json({ ...m, previewPath: `/preview/${scanId}` }, { headers: { "cache-control": "no-store" } });
  } catch (e) {
    console.error("[makeover]", e);
    return Response.json({ error: "Couldn't build the redesigned website. Try again." }, { status: 500 });
  }
}
