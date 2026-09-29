"use client";
import { motion } from "motion/react";
import { useState } from "react";
import styles from "./landing.module.css";
const FACTORS = [
  { key: "v", label: "Volume", hint: "How often it happens" },
  { key: "r", label: "Repetitiveness", hint: "Same answer every time?" },
  { key: "d", label: "Data on site", hint: "Is the answer published?" },
  { key: "k", label: "Risk", hint: "What if the agent is wrong?" },
];
const PRESETS = [
  { name: "Price enquiries", v: { v: 0.9, r: 0.95, d: 0.95, k: 0.05 } },
  { name: "Booking requests", v: { v: 0.8, r: 0.85, d: 0.8, k: 0.15 } },
  { name: "Complaints & refunds", v: { v: 0.4, r: 0.3, d: 0.3, k: 0.9 } },
];
export function FormulaPlayground() {
  const [vals, setVals] = useState(PRESETS[0].v);
  const [preset, setPreset] = useState(0);
  const score = Math.round(vals.v * vals.r * vals.d * (1 - vals.k) * 100);
  const verdict = vals.k >= 0.6 ? "human" : score >= 40 ? "automate" : "assist";
  const verdictText = { automate: "Automate it", assist: "Agent drafts, human approves", human: "Human only" }[verdict];
  return (
    <div className={styles.formula}>
      <div className={styles.formulaEq} aria-label="Automation score equals volume times repetitiveness times data availability times one minus risk">
        <span>Score</span>
        <i>=</i>
        {FACTORS.map((f, i) => (
          <span key={f.key} className={styles.term}>
            {f.key === "k" ? <>(1 − {f.label})</> : f.label}
            <b className="mono">{f.key === "k" ? (1 - vals.k).toFixed(2) : vals[f.key].toFixed(2)}</b>
            {i < 3 && <i>×</i>}
          </span>
        ))}
      </div>

      <div className={styles.formulaBody}>
        <div className={styles.sliders}>
          <div className="chips" role="group" aria-label="Example workflows">
            {PRESETS.map((p, i) => (
              <button
                key={p.name}
                className="chip"
                aria-pressed={preset === i}
                onClick={() => {
                  setPreset(i);
                  setVals(p.v);
                }}
              >
                {p.name}
              </button>
            ))}
          </div>
          {FACTORS.map((f) => (
            <label key={f.key} className={styles.slider}>
              <span>
                <b>{f.label}</b>
                <small className="muted">{f.hint}</small>
              </span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={vals[f.key]}
                onChange={(e) => {
                  setPreset(-1);
                  setVals({ ...vals, [f.key]: Number(e.target.value) });
                }}
                style={{ ["--p"]: `${vals[f.key] * 100}%` }}
                data-risk={f.key === "k" || undefined}
              />
              <output className="mono">{vals[f.key].toFixed(2)}</output>
            </label>
          ))}
        </div>

        <div className={styles.result} data-verdict={verdict}>
          <span className="mono muted" style={{ fontSize: ".75rem" }}>
            AUTOMATION SCORE
          </span>
          <motion.b key={score} initial={{ opacity: 0.4, y: 6 }} animate={{ opacity: 1, y: 0 }} className={styles.resultNum}>
            {score}
          </motion.b>
          <span className={styles.verdict}>{verdictText}</span>
          <p className="muted" style={{ margin: 0, fontSize: ".9rem" }}>
            {verdict === "human"
              ? "Risk above 0.6 always goes to a person, however easy it looks."
              : verdict === "automate"
                ? "Frequent, repetitive and already answered on the site. Hand it over."
                : "Worth doing partly. The agent writes the reply, someone taps send."}
          </p>
        </div>
      </div>
    </div>
  );
}
