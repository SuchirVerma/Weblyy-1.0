import { n8nWorkflow, systemPromptFor } from "@/lib/n8n";
import { allow, clientIp } from "@/lib/ratelimit";
import { createAgent, getScan } from "@/lib/store";
import type { Workflow } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const str = (v: unknown, max: number) => (typeof v === "string" ? v.slice(0, max) : "");
const strs = (v: unknown, n: number) => (Array.isArray(v) ? v.filter((x) => typeof x === "string").slice(0, n).map((x: string) => x.slice(0, 200)) : []);

function sanitizeWorkflow(raw: unknown): Workflow | null {
  const w = raw as Partial<Workflow> | null;
  if (!w || typeof w !== "object" || !str(w.name, 80)) return null;
  return {
    id: str(w.id, 40) || "workflow",
    name: str(w.name, 80),
    channel: w.channel ?? "whatsapp",
    channels: Array.isArray(w.channels) ? w.channels.slice(0, 4) : ["whatsapp"],
    trigger: str(w.trigger, 200),
    description: str(w.description, 400),
    volume: Number(w.volume) || 0,
    repetitiveness: Number(w.repetitiveness) || 0,
    dataAvailability: Number(w.dataAvailability) || 0,
    risk: Number(w.risk) || 0,
    score: Number(w.score) || 0,
    hoursPerWeek: Number(w.hoursPerWeek) || 0,
    verdict: w.verdict ?? "automate",
    reason: str(w.reason, 300),
    agentSteps: strs(w.agentSteps, 6),
    guardrails: strs(w.guardrails, 5),
  };
}

async function pushToN8n(workflow: ReturnType<typeof n8nWorkflow>) {
  const base = process.env.N8N_URL;
  const key = process.env.N8N_API_KEY;
  if (!base || !key) return { deployed: false, note: "n8n isn't connected yet. Download the JSON and import it in n8n." };
  try {
    const res = await fetch(`${base.replace(/\/$/, "")}/api/v1/workflows`, {
      method: "POST",
      headers: { "content-type": "application/json", "X-N8N-API-KEY": key },
      body: JSON.stringify(workflow),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { deployed: false, note: `n8n rejected the workflow (${res.status}). The JSON is still ready to import.` };
    const data = (await res.json()) as { id?: string };
    return { deployed: true, note: `Created in n8n${data.id ? ` (workflow ${data.id})` : ""}.`, id: data.id };
  } catch {
    return { deployed: false, note: "Couldn't reach n8n. The JSON is still ready to import." };
  }
}

export async function POST(req: Request) {
  if (!allow(`deploy:${clientIp(req)}`, 10, 60_000)) return Response.json({ error: "Too many deploys. Give it a minute." }, { status: 429 });
  let body: { scanId?: unknown; workflow?: unknown };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Bad request" }, { status: 400 });
  }
  const scan = typeof body.scanId === "string" ? await getScan(body.scanId) : null;
  if (!scan) return Response.json({ error: "This scan expired. Please scan the site again." }, { status: 404 });
  const workflow = sanitizeWorkflow(body.workflow);
  if (!workflow) return Response.json({ error: "Pick a workflow to deploy." }, { status: 400 });

  const agent = await createAgent(scan.knowledge, workflow.name);
  const appUrl = process.env.APP_URL || new URL(req.url).origin;
  const n8n = n8nWorkflow({ businessName: scan.knowledge.name, workflow, agentId: agent.id, appUrl });
  const n8nResult = await pushToN8n(n8n);

  return Response.json({
    agentId: agent.id,
    chatPath: `/chat/${agent.id}`,
    ownerKey: agent.ownerKey,
    ownerPath: `/owner/${agent.id}?key=${agent.ownerKey}`,
    whatsappWebhook: `${appUrl}/api/whatsapp?agent=${agent.id}`,
    n8n,
    n8nResult,
    systemPrompt: systemPromptFor(scan.knowledge.name, workflow),
  });
}
