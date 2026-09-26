import { aiAnalyze } from "@/lib/ai";
import { buildAnalysis, DEFAULT_ANSWERS, ruleWorkflows } from "@/lib/score";
import { getScan } from "@/lib/store";
import type { Answers } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function parseAnswers(raw: unknown): Answers {
  const a = (raw ?? {}) as Partial<Answers>;
  const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T =>
    options.includes(v as T) ? (v as T) : fallback;
  const num = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  return {
    dailyMessages: num(a.dailyMessages, 1, 500, DEFAULT_ANSWERS.dailyMessages),
    replier: pick(a.replier, ["owner", "staff", "nobody"] as const, DEFAULT_ANSWERS.replier),
    reminders: pick(a.reminders, ["manual", "none", "automated"] as const, DEFAULT_ANSWERS.reminders),
    afterHours: pick(a.afterHours, ["yes", "sometimes", "no"] as const, DEFAULT_ANSWERS.afterHours),
    hourlyCost: num(a.hourlyCost, 50, 5000, DEFAULT_ANSWERS.hourlyCost),
  };
}

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
      if (refined) return Response.json(buildAnalysis(scan, answers, refined.workflows, { summary: refined.summary, roast: refined.roast }));
    } catch (e) {
      console.error("[analyze] AI failed, using rules engine:", e instanceof Error ? e.message : e);
    }
  }
  return Response.json(buildAnalysis(scan, answers, draft));
}
