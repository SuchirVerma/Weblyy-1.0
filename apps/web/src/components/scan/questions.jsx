"use client";
import { motion } from "motion/react";
import { useState } from "react";
import { Arrow } from "../ui";
import styles from "./scan.module.css";
const Q = [
  {
    key: "dailyMessages",
    q: "How many customer messages come in on a normal day?",
    hint: "WhatsApp, calls, DMs and forms together",
    options: [
      { label: "Under 10", value: 8 },
      { label: "10 to 30", value: 20 },
      { label: "30 to 60", value: 40 },
      { label: "60+", value: 80 },
    ],
  },
  {
    key: "replier",
    q: "Who usually replies?",
    hint: "Be honest, nobody's judging",
    options: [
      { label: "The owner", value: "owner" },
      { label: "Front-desk staff", value: "staff" },
      { label: "Whoever's free", value: "nobody" },
    ],
  },
  {
    key: "reminders",
    q: "Do customers get a reminder before their visit?",
    hint: "Reminders cut no-shows",
    options: [
      { label: "Yes, sent by hand", value: "manual" },
      { label: "No reminders", value: "none" },
      { label: "Already automatic", value: "automated" },
    ],
  },
  {
    key: "afterHours",
    q: "Do messages after closing get answered that night?",
    hint: "Many enquiries arrive between 9 and 11pm",
    options: [
      { label: "Yes, always", value: "yes" },
      { label: "Sometimes", value: "sometimes" },
      { label: "Next morning", value: "no" },
    ],
  },
];
export const DEFAULT_ANSWERS_UI = { dailyMessages: 40, replier: "owner", reminders: "manual", afterHours: "sometimes", hourlyCost: 150 };
export function Questions({ scanId, scan, initial, onBack, onDone }) {
  const [a, setA] = useState(initial ?? DEFAULT_ANSWERS_UI);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async () => {
    setBusy(true);
    setError("");
    const started = Date.now();
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanId, answers: a }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Scoring failed.");
      const wait = 400 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      onDone(a, data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Scoring failed.");
      setBusy(false);
    }
  };
  return (
    <section className={styles.ask} aria-labelledby="ask-h">
      <div className={styles.askHead}>
        <p className="kicker">Step 2 · what the website can&apos;t tell us</p>
        <h1 id="ask-h" className="h-display" style={{ fontSize: "clamp(2rem, 4.4vw, 3.2rem)" }}>
          Four taps about <span className="em">{scan.knowledge.name}.</span>
        </h1>
        <p className="lede">We&apos;ve picked typical answers for a {scan.knowledge.businessType}. Change anything that&apos;s off.</p>
      </div>

      <div className={styles.qGrid}>
        {Q.map((q, i) => (
          <motion.fieldset
            key={q.key}
            className={styles.qCard}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <legend>
              <span className="mono accent">0{i + 1}</span> {q.q}
            </legend>
            <p className="muted">{q.hint}</p>
            <div className="chips" role="group">
              {q.options.map((o) => (
                <button
                  key={String(o.value)}
                  type="button"
                  className="chip"
                  aria-pressed={a[q.key] === o.value}
                  onClick={() => setA({ ...a, [q.key]: o.value })}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </motion.fieldset>
        ))}
      </div>

      <label className={styles.cost}>
        <span>
          <b>Cost of one hour of staff time</b>
          <small className="muted">Used for the rupees-saved number</small>
        </span>
        <span className={styles.costInput}>
          ₹
          <input
            type="number"
            inputMode="numeric"
            min={50}
            max={5000}
            value={a.hourlyCost}
            onChange={(e) => setA({ ...a, hourlyCost: Math.max(0, Number(e.target.value) || 0) })}
          />
          / hr
        </span>
      </label>

      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}

      <div className={styles.askActions}>
        <button className="btn btn-ghost" onClick={onBack} disabled={busy}>
          Back to the map
        </button>
        <button className="btn btn-primary" onClick={submit} disabled={busy} aria-busy={busy}>
          {busy ? (
            <>
              <span className={styles.spinner} aria-hidden="true" /> Updating your report…
            </>
          ) : (
            <>
              Update my report <Arrow />
            </>
          )}
        </button>
      </div>
    </section>
  );
}
