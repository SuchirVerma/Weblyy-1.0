"use client";
import { motion } from "motion/react";
import { useState, useSyncExternalStore } from "react";
import type { Audit } from "@/lib/audit";
import styles from "./score-columns.module.css";

const BEFORE = "#b9b2a4";
const AFTER = "#111111";
const SHORT: Record<string, string> = {
  website: "Website",
  agent: "AI assistant",
  leads: "Lead capture",
  search: "Found online",
  automation: "Autopilot",
};

/** Grouped column chart: each area's score before Weblyy and with Weblyy, on one 0-100 axis. */
export function ScoreColumns({ before, after }: { before: Audit; after: Audit }) {
  const [hover, setHover] = useState<{ i: number; s: 0 | 1 } | null>(null);
  const rows = before.categories.map((c) => ({
    key: c.key,
    label: SHORT[c.key] ?? c.label,
    full: c.label,
    b: c.score,
    a: after.categories.find((x) => x.key === c.key)?.score ?? c.score,
  }));

  // Narrow screens get a narrower drawing so the labels stay readable instead of shrinking.
  const narrow = useSyncExternalStore(
    (cb) => {
      const mq = matchMedia("(max-width: 560px)");
      mq.addEventListener("change", cb);
      return () => mq.removeEventListener("change", cb);
    },
    () => matchMedia("(max-width: 560px)").matches,
    () => false,
  );
  const W = narrow ? 360 : 720;
  const H = narrow ? 300 : 300;
  const m = { top: 26, right: 6, bottom: 44, left: narrow ? 28 : 40 };
  const iw = W - m.left - m.right;
  const ih = H - m.top - m.bottom;
  const band = iw / rows.length;
  const bw = Math.min(46, band * 0.3);
  const gap = 2;
  const y = (v: number) => m.top + ih - (v / 100) * ih;

  const bar = (x: number, v: number) => {
    const h = Math.max(0, (v / 100) * ih);
    const r = Math.min(4, h);
    const top = y(v);
    const base = m.top + ih;
    return `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + bw - r} Q${x + bw},${top} ${x + bw},${top + r} V${base} Z`;
  };

  return (
    <figure className={styles.fig}>
      <div className={styles.legend}>
        <span>
          <i style={{ background: BEFORE }} /> Before (your website today)
        </span>
        <span>
          <i style={{ background: AFTER }} /> With Weblyy
        </span>
      </div>
      <div className={styles.plot}>
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Score by area, before and with Weblyy" onMouseLeave={() => setHover(null)}>
          {[0, 25, 50, 75, 100].map((t) => (
            <g key={t}>
              <line x1={m.left} x2={W - m.right} y1={y(t)} y2={y(t)} className={t === 0 ? styles.base : styles.grid} />
              <text x={m.left - 8} y={y(t)} className={styles.tick} textAnchor="end" dominantBaseline="middle">
                {t}
              </text>
            </g>
          ))}
          {rows.map((r, i) => {
            const cx = m.left + band * i + band / 2;
            const xb = cx - bw - gap / 2;
            const xa = cx + gap / 2;
            return (
              <g key={r.key}>
                {/* generous hit targets */}
                <rect x={xb - 6} y={m.top} width={bw + 6} height={ih} fill="transparent" onMouseEnter={() => setHover({ i, s: 0 })} />
                <rect x={xa} y={m.top} width={bw + 6} height={ih} fill="transparent" onMouseEnter={() => setHover({ i, s: 1 })} />
                <motion.path
                  d={bar(xb, r.b)}
                  fill={BEFORE}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: hover && !(hover.i === i && hover.s === 0) ? 0.45 : 1, scaleY: 1 }}
                  style={{ transformOrigin: `${xb}px ${m.top + ih}px`, pointerEvents: "none" }}
                  transition={{ duration: 0.7, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
                <motion.path
                  d={bar(xa, r.a)}
                  fill={AFTER}
                  initial={{ opacity: 0, scaleY: 0 }}
                  animate={{ opacity: hover && !(hover.i === i && hover.s === 1) ? 0.45 : 1, scaleY: 1 }}
                  style={{ transformOrigin: `${xa}px ${m.top + ih}px`, pointerEvents: "none" }}
                  transition={{ duration: 0.8, delay: 0.25 + i * 0.06, ease: [0.22, 1, 0.36, 1] }}
                />
                <text x={xb + bw / 2} y={y(r.b) - 7} className={styles.val} textAnchor="middle">
                  {r.b}
                </text>
                <text x={xa + bw / 2} y={y(r.a) - 7} className={`${styles.val} ${styles.valStrong}`} textAnchor="middle">
                  {r.a}
                </text>
                <text x={cx} y={m.top + ih + 20} className={styles.cat} textAnchor="middle">
                  {narrow ? r.label.split(" ")[0] : r.label}
                </text>
                {narrow && r.label.includes(" ") && (
                  <text x={cx} y={m.top + ih + 34} className={styles.cat} textAnchor="middle">
                    {r.label.split(" ").slice(1).join(" ")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        {hover && (
          <div
            className={styles.tip}
            style={{
              left: `${((m.left + band * hover.i + band / 2) / W) * 100}%`,
              top: `${(y(hover.s ? rows[hover.i].a : rows[hover.i].b) / H) * 100}%`,
            }}
          >
            <b>{rows[hover.i].full}</b>
            <span>
              <i style={{ background: hover.s ? AFTER : BEFORE }} />
              {hover.s ? "With Weblyy" : "Before"}: <strong>{hover.s ? rows[hover.i].a : rows[hover.i].b}</strong>/100
            </span>
            <span className={styles.tipMuted}>
              {rows[hover.i].a - rows[hover.i].b > 0 ? `+${rows[hover.i].a - rows[hover.i].b} points with Weblyy` : "Already strong"}
            </span>
          </div>
        )}
      </div>
      <details className={styles.table}>
        <summary>Show as a table</summary>
        <table>
          <thead>
            <tr>
              <th>Area</th>
              <th>Before</th>
              <th>With Weblyy</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.key}>
                <td>{r.full}</td>
                <td>{r.b}</td>
                <td>{r.a}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
