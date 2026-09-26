import { getAgent } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Customer side: new messages from the owner since `after`, so the chat can show them live. */
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const agent = await getAgent(sp.get("agentId") ?? "");
  const from = (sp.get("from") ?? "").slice(0, 60);
  if (!agent || !from) return Response.json({ messages: [], ownerHandling: false });
  const after = Number(sp.get("after")) || 0;
  const c = agent.conversations[from];
  const messages = (c?.messages ?? []).filter((m) => m.role === "owner" && m.at > after).map((m) => ({ id: m.id, at: m.at, text: m.text }));
  return Response.json({ messages, ownerHandling: Boolean(c?.ownerHandling) }, { headers: { "cache-control": "no-store" } });
}
