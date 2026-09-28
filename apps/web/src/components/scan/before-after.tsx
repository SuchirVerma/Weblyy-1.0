"use client";
import { motion } from "motion/react";
import type { Audit } from "@/lib/audit";
import { CountUp } from "../ui";
import { useReducedSafe } from "../use-reduced";
import styles from "./before-after.module.css";

/** One bar per area: where the business is now, and where it lands with Weblyy. Click a row for the checks. */
export function BeforeAfterChart({ before, after }: { before: Audit; after: Audit }) {
  const reduce = useReducedSafe();
  return (
    <div className={styles.chart}>
      <div className={styles.legend} aria-hidden="true">
        <span>
          <i data-k="now" /> Now
        </span>
        <span>
          <i data-k="after" /> With Weblyy
        </span>
      </div>
      <ul className={styles.rows}>
        {before.categories.map((c, i) => {
          const a = after.categories.find((x) => x.key === c.key)?.score ?? c.score;
          return (
            <li key={c.key}>
              <details>
                <summary aria-label={`${c.label}: ${c.score} now, ${a} with Weblyy`}>
                  <span className={styles.label}>{c.label}</span>
                  <span className={styles.track}>
                    <motion.span
                      className={styles.after}
                      initial={{ width: reduce ? `${a}%` : 0 }}
                      animate={{ width: `${a}%` }}
                      transition={{ duration: 0.9, delay: 0.3 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                    <motion.span
                      className={styles.now}
                      data-level={c.level}
                      initial={{ width: reduce ? `${c.score}%` : 0 }}
                      animate={{ width: `${c.score}%` }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    />
                  </span>
                  <span className={styles.nums}>
                    <b data-level={c.level}>{c.score}</b>
                    <span aria-hidden="true">→</span>
                    <b className={styles.up}>{a}</b>
                  </span>
                </summary>
                <ul className={styles.checks}>
                  {c.checks.map((x) => (
                    <li key={x.label} data-ok={x.ok === true ? "yes" : x.ok === "partial" ? "partial" : "no"}>
                      <b>{x.label}</b> <span className="muted">{x.detail}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
      <p className={styles.hint}>Tap an area to see what we checked.</p>
    </div>
  );
}

/** The three areas with the biggest jump, as short cards instead of long lists. */
export function TopFixes({ before, after }: { before: Audit; after: Audit }) {
  const fixes = before.categories
    .map((c) => ({ c, gain: (after.categories.find((x) => x.key === c.key)?.score ?? c.score) - c.score }))
    .filter((f) => f.gain > 0)
    .sort((x, y) => y.gain - x.gain)
    .slice(0, 3);
  if (!fixes.length) return null;
  return (
    <ol className={styles.fixes}>
      {fixes.map(({ c, gain }, i) => (
        <motion.li key={c.key} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
          <span className={styles.fixNum}>{i + 1}</span>
          <b className={styles.gain}>+{gain}</b>
          <span className={styles.fixLabel}>{c.label}</span>
          {c.recommendations[0] && <small>{c.recommendations[0]}</small>}
        </motion.li>
      ))}
    </ol>
  );
}

export function StatTiles({ items }: { items: { label: string; to: number; prefix?: string; suffix?: string; decimals?: number; tone?: "bad" | "ok" }[] }) {
  return (
    <div className={styles.tiles}>
      {items.map((t) => (
        <div key={t.label} data-tone={t.tone}>
          <b>
            <CountUp to={t.to} prefix={t.prefix} decimals={t.decimals} />
            {t.suffix && <small>{t.suffix}</small>}
          </b>
          <span className={styles.tileLabel}>{t.label}</span>
        </div>
      ))}
    </div>
  );
}
