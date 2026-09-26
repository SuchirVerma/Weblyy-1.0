/**
 * Optional AI layer. Nothing is connected in this build, so scoring and replies come from the rules engine
 * (score.ts and rules-agent.ts). Every function returns null, which callers read as "use the rules".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Result = Promise<any>;

export function getAI(): null {
  return null;
}

export const aiEnabled = () => getAI() !== null;

/** Limits for live chat, where a slow answer is worse than a simple one. */
export const LIVE = { timeout: 12_000, maxRetries: 0 };

export async function aiAnalyze(..._args: unknown[]): Result {
  return null;
}

export async function aiReply(..._args: unknown[]): Result {
  return null;
}
