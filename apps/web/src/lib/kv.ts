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

export const redis: Redis | null = url && token ? new Redis({ url, token, automaticDeserialization: true }) : null;
export const useRedis = Boolean(redis);

/** Running on a serverless platform, where background timers and local files don't last. */
export const serverless = Boolean(process.env.VERCEL);

/** Keeps a write going after the response is sent (Vercel), or just lets it run (anywhere else). */
export function background(p: Promise<unknown>) {
  const safe = p.catch((e) => console.error("[kv]", e instanceof Error ? e.message : e));
  try {
    waitUntil(safe);
  } catch {
    /* not inside a request */
  }
  return safe;
}

export async function getJSON<T>(key: string): Promise<T | null> {
  return redis ? ((await redis.get<T>(key)) ?? null) : null;
}

export async function setJSON(key: string, value: unknown, ttlSeconds?: number) {
  if (!redis) return;
  if (ttlSeconds) await redis.set(key, value, { ex: ttlSeconds });
  else await redis.set(key, value);
}

export async function getMany<T>(keys: string[]): Promise<T[]> {
  if (!redis || !keys.length) return [];
  const out: T[] = [];
  for (let i = 0; i < keys.length; i += 100) {
    const part = await redis.mget<(T | null)[]>(...keys.slice(i, i + 100));
    for (const x of part) if (x) out.push(x);
  }
  return out;
}

/** Binary values (screenshots) are stored as base64. */
export async function setBytes(key: string, buf: Buffer, ttlSeconds: number) {
  if (redis) await redis.set(key, buf.toString("base64"), { ex: ttlSeconds });
}
export async function getBytes(key: string): Promise<Buffer | null> {
  if (!redis) return null;
  const v = await redis.get<string>(key);
  return typeof v === "string" ? Buffer.from(v, "base64") : null;
}
