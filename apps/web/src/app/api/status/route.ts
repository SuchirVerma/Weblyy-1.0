import { networkInterfaces } from "node:os";
import { aiEnabled } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** When running on a laptop, phones can't open "localhost". Find the LAN address for QR codes. */
function lanOrigin(req: Request): string | null {
  const url = new URL(req.url);
  if (!/^(localhost|127\.0\.0\.1|\[::1\])$/.test(url.hostname)) return null;
  for (const list of Object.values(networkInterfaces())) {
    for (const i of list ?? []) {
      if (i.family === "IPv4" && !i.internal && !i.address.startsWith("169.254")) return `${url.protocol}//${i.address}:${url.port || 80}`;
    }
  }
  return null;
}

export function GET(req: Request) {
  return Response.json({
    ai: aiEnabled() ? "ai" : "rules",
    n8n: Boolean(process.env.N8N_URL && process.env.N8N_API_KEY),
    publicOrigin: process.env.APP_URL || lanOrigin(req),
  });
}
