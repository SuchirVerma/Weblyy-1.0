import { allow, clientIp } from "@/lib/ratelimit";
import { searchBusiness } from "@/lib/search";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 45;
export async function GET(req) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) return Response.json({ error: "Type a business name to search." }, { status: 400 });
  if (!(await allow(`search:${clientIp(req)}`, 10, 60_000))) return Response.json({ error: "Too many searches. Give it a minute." }, { status: 429 });
  try {
    const { results, answered } = await searchBusiness(q);
    return Response.json({ q, results, unavailable: !answered });
  } catch (e) {
    console.error("[search]", e);
    return Response.json({ error: "Search isn't working right now. Paste the website or @instagram handle instead." }, { status: 502 });
  }
}
