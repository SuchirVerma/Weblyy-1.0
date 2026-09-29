"use client";
import { animate, AnimatePresence, motion, useMotionValue, useMotionValueEvent, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { useReducedSafe } from "../use-reduced";
import styles from "./score-reveal.module.css";

const AREAS = ["your website", "the AI assistant", "lead capture", "how you're found online", "automation"];
const SIZE = 260;
const C0 = SIZE / 2;
const R = 100;
const ARC = 0.75; // 270° dial
const CIRC = 2 * Math.PI * R;
const TICKS = 45;
const EASE = [0.22, 1, 0.36, 1] as const;

function band(score: number) {
  if (score < 40) return { label: "Losing customers", tone: "var(--bad)" };
  if (score < 65) return { label: "Getting there", tone: "var(--warn)" };
  return { label: "Well set up", tone: "var(--ok)" };
}

/** Point on the dial for a score 0–100 (dial starts bottom-left, runs clockwise). */
function at(v: number, r = R) {
  const a = ((135 + 270 * (v / 100)) * Math.PI) / 180;
  return { x: C0 + r * Math.cos(a), y: C0 + r * Math.sin(a) };
}

type Phase = "checking" | "counting" | "done";

/** The AI readiness score, revealed like a title card: check, count, then show what Weblyy adds. */
export function ScoreReveal({ score, after }: { score: number; after?: number }) {
  const [run, setRun] = useState(0);
  return <Reveal key={run} score={score} after={after} onReplay={() => setRun((n) => n + 1)} />;
}

function Reveal({ score, after, onReplay }: { score: number; after?: number; onReplay: () => void }) {
  const reduce = useReducedSafe();
  const [played, setPhase] = useState<Phase>("checking");
  // With reduced motion there is no show: go straight to the result.
  const phase: Phase = reduce ? "done" : played;
  const [area, setArea] = useState(0);
  const [view, setView] = useState<"now" | "after">("now");
  const [lit, setLit] = useState(() => (reduce ? Math.round((score / 100) * TICKS) : 0));
  const value = useMotionValue(reduce ? score : 0);
  const shown = useTransform(value, (v) => Math.round(v));
  const offset = useTransform(value, (v) => CIRC * ARC * (1 - v / 100));
  const headX = useTransform(value, (v) => at(v).x);
  const headY = useTransform(value, (v) => at(v).y);
  useMotionValueEvent(value, "change", (v) => setLit(Math.round((v / 100) * TICKS)));
  const gain = after && after > score ? after - score : 0;
  const b = band(view === "after" && after ? after : score);

  // Beat 1: sweep through the five areas. Beat 2: count up.
  useEffect(() => {
    if (reduce) {
      value.set(score);
      return;
    }
    let i = 0;
    const tick = setInterval(() => {
      i += 1;
      if (i < AREAS.length) setArea(i);
      else {
        clearInterval(tick);
        setPhase("counting");
        animate(value, score, { duration: 1.9, ease: EASE, onComplete: () => setPhase("done") });
      }
    }, 420);
    return () => clearInterval(tick);
  }, [reduce, score, value]);

  // Flip between today and with Weblyy.
  const show = (v: "now" | "after") => {
    if (phase !== "done" || v === view || !after) return;
    setView(v);
    animate(value, v === "after" ? after : score, { duration: reduce ? 0 : 1.1, ease: EASE });
  };

  const ghostLen = CIRC * ARC * (gain / 100);
  const accent = view === "after";

  return (
    <div className={styles.stage} data-phase={phase}>
      <div className={styles.spot} aria-hidden="true" />
      <div className={styles.dial}>
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <defs>
            <filter id="sr-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="6" />
            </filter>
            <linearGradient id="sr-now" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#555555" />
              <stop offset="100%" stopColor="#111111" />
            </linearGradient>
            <linearGradient id="sr-after" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="#b9b2a4" />
              <stop offset="100%" stopColor="#111111" />
            </linearGradient>
          </defs>

          {/* tick ring */}
          {Array.from({ length: TICKS + 1 }, (_, i) => {
            const v = (i / TICKS) * 100;
            const p1 = at(v, 114);
            const p2 = at(v, i % 5 === 0 ? 124 : 120);
            const on = phase === "checking" ? Math.abs(i - ((area + 1) / AREAS.length) * TICKS) < 4 : i <= lit;
            return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} className={styles.tick} data-on={on || undefined} data-accent={(on && accent) || undefined} />;
          })}

          <circle cx={C0} cy={C0} r={R} className={styles.track} strokeDasharray={`${CIRC * ARC} ${CIRC}`} transform={`rotate(135 ${C0} ${C0})`} />

          {/* the Weblyy preview: from today's score to the upgraded one */}
          {gain > 0 && view === "now" && (
            <motion.circle
              cx={C0}
              cy={C0}
              r={R}
              className={styles.ghost}
              strokeDasharray={`${ghostLen} ${CIRC}`}
              transform={`rotate(${135 + 270 * (score / 100)} ${C0} ${C0})`}
              initial={{ strokeDashoffset: ghostLen, opacity: 0 }}
              animate={phase === "done" ? { strokeDashoffset: 0, opacity: 1 } : { strokeDashoffset: ghostLen, opacity: 0 }}
              transition={{ duration: reduce ? 0 : 1, delay: reduce ? 0 : 0.5, ease: EASE }}
            />
          )}

          <motion.circle
            cx={C0}
            cy={C0}
            r={R}
            className={styles.fill}
            stroke={accent ? "url(#sr-after)" : "url(#sr-now)"}
            strokeDasharray={`${CIRC * ARC} ${CIRC}`}
            style={{ strokeDashoffset: offset }}
            transform={`rotate(135 ${C0} ${C0})`}
          />

          {/* glowing head */}
          {phase !== "checking" && (
            <g>
              
              <motion.circle cx={headX} cy={headY} r={5.5} className={styles.head} data-accent={accent || undefined} />
            </g>
          )}
        </svg>

        <div className={styles.center}>
          <AnimatePresence mode="wait">
            {phase === "checking" ? (
              <motion.div key="checking" className={styles.checking} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 0.96 }}>
                <small>Checking</small>
                <motion.b key={area} initial={{ opacity: 0, y: 8, filter: "blur(4px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} transition={{ duration: 0.2 }}>
                  {AREAS[area]}
                </motion.b>
                <span className={styles.dots}>
                  {AREAS.map((_, i) => (
                    <i key={i} data-on={i <= area || undefined} />
                  ))}
                </span>
              </motion.div>
            ) : (
              <motion.div
                key="score"
                className={styles.score}
                initial={{ opacity: 0, scale: 0.9, filter: "blur(10px)" }}
                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                transition={{ duration: reduce ? 0 : 0.7, ease: EASE }}
              >
                <motion.b data-accent={accent || undefined}>{shown}</motion.b>
                <span className={styles.outOf}>out of 100</span>
                <motion.em
                  key={b.label}
                  initial={{ opacity: 0, y: 6 }}
                  animate={phase === "done" ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
                  transition={{ duration: 0.4 }}
                >
                  <i style={{ background: b.tone }} aria-hidden="true" /> {b.label}
                </motion.em>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {phase === "done" && gain > 0 && view === "now" && (
            <motion.span
              className={styles.gain}
              style={{ left: `${(at(after!, 130).x / SIZE) * 100}%`, top: `${(at(after!, 130).y / SIZE) * 100}%` }}
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ type: "spring", stiffness: 380, damping: 18, delay: reduce ? 0 : 1.3 }}
            >
              +{gain}
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      <motion.div
        className={styles.controls}
        initial={{ opacity: 0, y: 8 }}
        animate={phase === "done" ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: 0.4, delay: reduce ? 0 : 0.9 }}
        aria-hidden={phase !== "done"}
      >
        {after && gain > 0 && (
          <div className={styles.toggle} role="group" aria-label="Show score">
            <button aria-pressed={view === "now"} onClick={() => show("now")}>
              Today <b>{score}</b>
            </button>
            <button aria-pressed={view === "after"} onClick={() => show("after")}>
              With Weblyy <b>{after}</b>
            </button>
            <span className={styles.pill} data-side={view} aria-hidden="true" />
          </div>
        )}
        <button className={styles.replay} onClick={onReplay} aria-label="Replay the score animation">
          ↻ Replay
        </button>
      </motion.div>
    </div>
  );
}
