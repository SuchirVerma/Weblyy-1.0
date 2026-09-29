/**
 * Optional AI layer. Nothing is connected in this build, so scoring and replies come from the rules engine
 * (score.js and rules-agent.js). Every function returns null, which callers read as "use the rules".
 */
export function getAI() {
  return null;
}

export const aiEnabled = () => getAI() !== null;

/** Limits for live chat, where a slow answer is worse than a simple one. */
export const LIVE = { timeout: 12_000, maxRetries: 0 };

export async function aiAnalyze() {
  return null;
}

export async function aiReply() {
  return null;
}
