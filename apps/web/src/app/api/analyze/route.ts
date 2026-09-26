import { auditBusiness } from "@/lib/audit";
import { aiAnalyze } from "@/lib/ai";
import { parseAnswers } from "@/lib/answers";
import { buildAnalysis, ruleWorkflows } from "@/lib/score";
import { getScan } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  let body: { scanId?: unknown; answers?: unknown; ai?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const scan = typeof body.scanId === "string" ? getScan(body.scanId) : null;
  if (!scan) return Response.json({ error: "This scan expired. Please scan the site again." }, { status: 404 });

  const answers = parseAnswers(body.answers);
  const draft = ruleWorkflows(scan, answers);
  if (body.ai !== false) {
    try {
      const refined = await aiAnalyze(scan, answers, draft);
      if (refined) {
        const a = buildAnalysis(scan, answers, refined.workflows, { summary: refined.summary, roast: refined.roast });
        const audit = auditBusiness(scan, answers);
        return Response.json({ ...a, audit, readiness: audit.score });
      }
    } catch (e) {
      console.error("[analyze] AI failed, using rules engine:", e instanceof Error ? e.message : e);
    }
  }
  const a = buildAnalysis(scan, answers, draft);
  const audit = auditBusiness(scan, answers);
  return Response.json({ ...a, audit, readiness: audit.score });
}
