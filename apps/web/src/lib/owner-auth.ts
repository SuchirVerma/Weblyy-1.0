import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { DeployedAgent } from "./store";

export function ownerKeyOk(agent: DeployedAgent, key: string | null | undefined) {
  if (!key) return false;
  const a = Buffer.from(agent.ownerKey);
  const b = Buffer.from(key);
  return a.length === b.length && timingSafeEqual(a, b);
}
