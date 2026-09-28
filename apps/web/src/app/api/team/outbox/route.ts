import { processOutbox } from "@/lib/outbox";
import { teamAllowed } from "@/lib/team-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Retry now" on the team page: tries every undelivered SMS and sheet row immediately. */
export async function POST(req: Request) {
  const url = new URL(req.url);
  if (!teamAllowed(req.headers.get("host") ?? "", url.searchParams.get("key"))) return Response.json({ error: "Not allowed" }, { status: 403 });
  await processOutbox(true);
  return Response.json({ ok: true });
}
