import { processOutbox } from "@/lib/outbox";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
/**
 * Daily safety net for setup-request deliveries (Vercel Cron). Vercel signs cron calls with CRON_SECRET when it is set;
 * without it, only Vercel's own cron runner may call this.
 */
export async function GET(req) {
  const secret = process.env.CRON_SECRET;
  const ok = secret ? req.headers.get("authorization") === `Bearer ${secret}` : /vercel-cron/i.test(req.headers.get("user-agent") ?? "");
  if (!ok) return Response.json({ error: "Not allowed" }, { status: 401 });
  await processOutbox();
  return Response.json({ ok: true });
}
