import "server-only";
import { waitUntil } from "@vercel/functions";
import { Redis } from "@upstash/redis";
/**
 * Where Weblyy keeps its data.
 * On a normal server everything lives in memory and in files under .data/.
 * On Vercel (no lasting disk, many short-lived instances) it lives in Upstash Redis instead,
 * switched on by the env vars the Vercel Upstash integration adds.
 */
const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
export const redis = url && token ? new Redis({ url, token, automaticDeserialization: true }) : null;
export const useRedis = Boolean(redis);
/** Running on a serverless platform, where background timers and local files don't last. */
export const serverless = Boolean(process.env.VERCEL);
/** Keeps a write going after the response is sent (Vercel), or just lets it run (anywhere else). */
export function background(p) {
  const safe = p.catch((e) => console.error("[kv]", e instanceof Error ? e.message : e));
  try {
    waitUntil(safe);
  } catch {
    /* not inside a request */
  }
  return safe;
}
export async function getJSON(key) {
  return redis ? ((await redis.get(key)) ?? null) : null;
}
export async function setJSON(key, value, ttlSeconds) {
  if (!redis) return;
  if (ttlSeconds) await redis.set(key, value, { ex: ttlSeconds });
  else await redis.set(key, value);
}
export async function getMany(keys) {
  if (!redis || !keys.length) return [];
  const out = [];
  for (let i = 0; i < keys.length; i += 100) {
    const part = await redis.mget(...keys.slice(i, i + 100));
    for (const x of part) if (x) out.push(x);
  }
  return out;
}
/** Binary values (screenshots) are stored as base64. */
export async function setBytes(key, buf, ttlSeconds) {
  if (redis) await redis.set(key, buf.toString("base64"), { ex: ttlSeconds });
}
export async function getBytes(key) {
  if (!redis) return null;
  const v = await redis.get(key);
  return typeof v === "string" ? Buffer.from(v, "base64") : null;
}
