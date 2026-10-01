import { crawl } from "@/lib/crawl";
import { allow, clientIp } from "@/lib/ratelimit";
import { createAgent, getAgent } from "@/lib/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const g = globalThis;
/** Switches on an agent for the bundled demo salon and opens its website with the chat bubble. */
export async function GET(req) {
  const origin = new URL(req.url).origin;
  const existing = g.__fsDemoAgent ? await getAgent(g.__fsDemoAgent) : null;
  if (!existing) {
    if (!(await allow(`demo-agent:${clientIp(req)}`, 5, 60_000))) return Response.json({ error: "Too many requests" }, { status: 429 });
    const knowledge = await crawl("demo", () => {});
    const agent = await createAgent(knowledge, "Website chat");
    g.__fsDemoAgent = agent.id;
  }
  return Response.redirect(`${origin}/demo/kesar/index.html?agent=${g.__fsDemoAgent}`, 302);
}
