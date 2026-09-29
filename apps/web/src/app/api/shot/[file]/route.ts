import { readFile } from "node:fs/promises";
import path from "node:path";
import { SHOT_DIR } from "@/lib/capture";

export const runtime = "nodejs";

/** Serves a before/after screenshot. Names are random, so they can be cached forever. */
export async function GET(_req: Request, ctx: RouteContext<"/api/shot/[file]">) {
  const { file } = await ctx.params;
  if (!/^[a-f0-9]{16}-(desktop|mobile)\.jpg$/.test(file)) return new Response("Not found", { status: 404 });
  try {
    const buf = await readFile(path.join(SHOT_DIR, file));
    return new Response(new Uint8Array(buf), { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
