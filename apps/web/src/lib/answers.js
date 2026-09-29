import { DEFAULT_ANSWERS } from "./score";
export function parseAnswers(raw) {
  const a = raw ?? {};
  const pick = (v, options, fallback) => (options.includes(v) ? v : fallback);
  const num = (v, min, max, fallback) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);
  return {
    dailyMessages: num(a.dailyMessages, 1, 500, DEFAULT_ANSWERS.dailyMessages),
    replier: pick(a.replier, ["owner", "staff", "nobody"], DEFAULT_ANSWERS.replier),
    reminders: pick(a.reminders, ["manual", "none", "automated"], DEFAULT_ANSWERS.reminders),
    afterHours: pick(a.afterHours, ["yes", "sometimes", "no"], DEFAULT_ANSWERS.afterHours),
    hourlyCost: num(a.hourlyCost, 50, 5000, DEFAULT_ANSWERS.hourlyCost),
  };
}
