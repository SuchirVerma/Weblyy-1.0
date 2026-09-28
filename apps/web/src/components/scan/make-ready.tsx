"use client";
import { AnimatePresence, motion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import type { Answers } from "@/lib/types";
import styles from "./make-ready.module.css";

const STEPS = [
  { t: "Transforming your website", d: "Mobile-first layout, clear headline, Book / Call / Chat buttons" },
  { t: "Training your AI Customer Agent", d: "Learning prices, services, hours and FAQs from your site" },
  { t: "Optimizing for AI search", d: "Business summary, structured data, FAQs, meta tags" },
  { t: "Opening your Lead Center", d: "Capture, qualify and follow up every interested customer" },
  { t: "Switching on automations", d: "Lead follow-up, booking requests, owner alerts" },
];

/** Fired by the "Make My Business AI-Ready" button in the top corner of the report; this component runs the flow. */
export const MAKE_READY_EVENT = "weblyy:make-ready";

export function MakeReady({ scanId, answers, name }: { scanId: string; answers: Answers | null; name: string }) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "working" | "done">("idle");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ before: number; after: number } | null>(null);

  const start = async () => {
    setPhase("working");
    setError("");
    setStep(0);
    const tick = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 420);
    const started = Date.now();
    try {
      const res = await fetch("/api/workspace", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanId, answers }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Something went wrong.");
      const wait = STEPS.length * 420 + 200 - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      clearInterval(tick);
      setStep(STEPS.length);
      setResult({ before: d.before, after: d.after });
      setPhase("done");
      setTimeout(() => router.push(d.dashboardPath), 1000);
    } catch (e) {
      clearInterval(tick);
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setPhase("idle");
    }
  };

  const startRef = useRef(start);
  const phaseRef = useRef(phase);
  useEffect(() => {
    startRef.current = start;
    phaseRef.current = phase;
  });
  useEffect(() => {
    const onTrigger = () => {
      if (phaseRef.current === "idle") startRef.current();
    };
    window.addEventListener(MAKE_READY_EVENT, onTrigger);
    return () => window.removeEventListener(MAKE_READY_EVENT, onTrigger);
  }, []);

  return (
    <>
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}

      <AnimatePresence>
        {phase !== "idle" && (
          <motion.div className={styles.overlay} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-label="Making your business AI-ready">
            <motion.div className={styles.modal} initial={{ y: 20, scale: 0.97 }} animate={{ y: 0, scale: 1 }}>
              <p className="kicker">{phase === "done" ? "Done" : "Working on it"}</p>
              <h3>{phase === "done" ? `${name} is AI-ready.` : `Making ${name} AI-ready…`}</h3>
              <ol className={styles.steps}>
                {STEPS.map((s, i) => (
                  <li key={s.t} data-state={i < step ? "done" : i === step && phase === "working" ? "now" : "todo"}>
                    <span aria-hidden="true">{i < step ? "✓" : i === step && phase === "working" ? "" : i + 1}</span>
                    <div>
                      <b>{s.t}</b>
                      <small>{s.d}</small>
                    </div>
                  </li>
                ))}
              </ol>
              {result && (
                <motion.div className={styles.score} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                  AI readiness <b>{result.before}</b> → <b className={styles.after}>{result.after}</b>
                  <small>Opening your Command Center…</small>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
