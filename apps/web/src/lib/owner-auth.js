import "server-only";
import { timingSafeEqual } from "node:crypto";
export function ownerKeyOk(agent, key) {
  if (!key) return false;
  const a = Buffer.from(agent.ownerKey);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
