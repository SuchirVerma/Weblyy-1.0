import { buildSearchPack } from "@/lib/aisearch";
import { parseAnswers } from "@/lib/answers";
import { auditBusiness } from "@/lib/audit";
import { allow, clientIp } from "@/lib/ratelimit";
import { ensureMakeover, internalOrigin } from "@/lib/makeover-run";
import { createAgent, getScan, recordRun, savePersist } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** "Make my business AI-ready": switches on the agent, the AI-ready website, AI Search assets, Lead Center and automations. */
export async function POST(req: Request) {
  if (!allow(`workspace:${clientIp(req)}`, 8, 60_000)) return Response.json({ error: "Too many requests. Give it a minute." }, { status: 429 });
  let body: { scanId?: unknown; answers?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const scan = typeof body.scanId === "string" ? getScan(body.scanId) : null;
  if (!scan) return Response.json({ error: "This scan expired. Please analyze the website again." }, { status: 404 });
  const answers = parseAnswers(body.answers);
  // Usually ready already (the report builds it); don't hold up going live if it isn't.
  const makeover = await Promise.race([ensureMakeover(body.scanId as string, scan, internalOrigin(req)).catch(() => undefined), new Promise<undefined>((r) => setTimeout(r, 30_000))]);

  const agent = await createAgent(scan.knowledge, "AI Customer Agent");
  const origin = process.env.APP_URL || new URL(req.url).origin;
  const sitePath = `/site/${agent.id}`;
  agent.workspace = {
    createdAt: Date.now(),
    sourceUrl: scan.knowledge.url,
    answers,
    auditBefore: auditBusiness(scan, answers),
    auditAfter: auditBusiness(scan, answers, { agent: true, website: true, search: true, leadCenter: true, automations: true }),
    search: buildSearchPack(scan.knowledge, `${origin}${sitePath}`),
    makeover,
  };
  recordRun(agent, "Your business went live", ["Audit", "AI-ready website", "AI Customer Agent", "AI Search", "Lead Center", "Automations"], `${scan.knowledge.name} is live`);
  savePersist();
  return Response.json({
    id: agent.id,
    key: agent.ownerKey,
    dashboardPath: `/dashboard/${agent.id}?key=${agent.ownerKey}`,
    sitePath,
    before: agent.workspace.auditBefore.score,
    after: agent.workspace.auditAfter.score,
  });
}
