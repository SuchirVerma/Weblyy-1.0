import "server-only";
import { redis } from "./kv";
const buckets = (globalThis.__weblyyRl ??= new Map());
/** In-memory sliding window, for a single server (and as the fallback when Redis is unreachable). */
function allowLocal(key, max, windowMs) {
  const now = Date.now();
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= max) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) buckets.clear();
  return true;
}
/**
 * True when the key has made fewer than `max` calls in `windowMs`.
 * With Redis (Vercel) the count is shared by every server instance, so the limit can't be dodged by
 * landing on a fresh one. A Redis hiccup never blocks a real user: it falls back to the local count.
 */
export async function allow(key, max, windowMs) {
  if (!redis) return allowLocal(key, max, windowMs);
  try {
    const slot = Math.floor(Date.now() / windowMs);
    const k = `rl:${key}:${slot}`;
    const n = await redis.incr(k);
    if (n === 1) await redis.expire(k, Math.ceil(windowMs / 1000) + 5);
    return n <= max;
  } catch (e) {
    console.error("[ratelimit] redis unavailable, using local count:", e instanceof Error ? e.message : e);
    return allowLocal(key, max, windowMs);
  }
}
export function clientIp(req) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
