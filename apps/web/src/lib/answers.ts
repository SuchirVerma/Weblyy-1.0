import { DEFAULT_ANSWERS } from "./score";
import type { Answers } from "./types";

export function parseAnswers(raw: unknown): Answers {
  const a = (raw ?? {}) as Partial<Answers>;
  const pick = <T extends string>(v: unknown, options: readonly T[], fallback: T): T => (options.includes(v as T) ? (v as T) : fallback);
  const num = (v: unknown, min: number, max: number, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;
  return {
    dailyMessages: num(a.dailyMessages, 1, 500, DEFAULT_ANSWERS.dailyMessages),
    replier: pick(a.replier, ["owner", "staff", "nobody"] as const, DEFAULT_ANSWERS.replier),
    reminders: pick(a.reminders, ["manual", "none", "automated"] as const, DEFAULT_ANSWERS.reminders),
    afterHours: pick(a.afterHours, ["yes", "sometimes", "no"] as const, DEFAULT_ANSWERS.afterHours),
    hourlyCost: num(a.hourlyCost, 50, 5000, DEFAULT_ANSWERS.hourlyCost),
  };
}
