import "server-only";
const buckets = (globalThis.__weblyyRl ??= new Map());
/** Sliding-window limiter: true when the key has made fewer than `max` calls in `windowMs`. */
export function allow(key, max, windowMs) {
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
export function clientIp(req) {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}
