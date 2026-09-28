"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { Analysis, Answers, ScanResult, Workflow } from "@/lib/types";
import { CHANNEL_NAME } from "../radar";
import { CountUp } from "../ui";
import { Blueprint } from "./blueprint";
import { MakeReady } from "./make-ready";
import { BeforeAfterChart, StatTiles, TopFixes } from "./before-after";
import { SiteReport } from "./site-report";
import { WebPresencePanel } from "./web-presence";
import type { Deployment } from "./live-console";
import { useReducedSafe } from "../use-reduced";
import styles from "./scan.module.css";

const VERDICT = {
  automate: { label: "Automate", tone: "var(--ok)" },
  assist: { label: "Assist", tone: "var(--warn)" },
  human: { label: "Human only", tone: "var(--bad)" },
} as const;

function band(score: number) {
  if (score < 40) return { label: "Leaking customers", tone: "var(--bad)" };
  if (score < 65) return { label: "Getting there", tone: "var(--warn)" };
  return { label: "Well set up", tone: "var(--ok)" };
}

function Gauge({ value }: { value: number }) {
  const reduce = useReducedSafe();
  const r = 84;
  const c = 2 * Math.PI * r;
  const arc = 0.75;
  const b = band(value);
  return (
    <div className={styles.gauge}>
      <svg viewBox="0 0 200 200" aria-hidden="true">
        <circle cx="100" cy="100" r={r} className={styles.gaugeTrack} strokeDasharray={`${c * arc} ${c}`} transform="rotate(135 100 100)" />
        <motion.circle
          cx="100"
          cy="100"
          r={r}
          className={styles.gaugeFill}
          style={{ stroke: b.tone }}
          strokeDasharray={`${c * arc} ${c}`}
          transform="rotate(135 100 100)"
          initial={{ strokeDashoffset: c * arc }}
          animate={{ strokeDashoffset: c * arc * (1 - value / 100) }}
          transition={{ duration: reduce ? 0 : 1.6, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
        />
      </svg>
      <div className={styles.gaugeText}>
        <b>
          <CountUp to={value} duration={1.6} />
        </b>
        <span className="mono">/ 100</span>
        <em style={{ color: b.tone }}>{b.label}</em>
      </div>
    </div>
  );
}

function Bar({ label, value, invert, hint }: { label: string; value: number; invert?: boolean; hint: string }) {
  const good = invert ? 100 - value : value;
  const tone = good >= 65 ? "var(--ok)" : good >= 40 ? "var(--warn)" : "var(--bad)";
  return (
    <div className={styles.bar}>
      <div className={styles.barTop}>
        <span>
          {label} <small className="muted">{hint}</small>
        </span>
        <b className="mono">{value}</b>
      </div>
      <div className={styles.barTrack}>
        <motion.div
          className={styles.barFill}
          style={{ background: tone }}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: value / 100 }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1], delay: 0.4 }}
        />
      </div>
    </div>
  );
}

function Typewriter({ text, delay }: { text: string; delay: number }) {
  const reduce = useReducedSafe();
  const [typed, setN] = useState(0);
  const n = reduce ? text.length : typed;
  useEffect(() => {
    if (reduce) return;
    let i = 0;
    let t: ReturnType<typeof setTimeout>;
    const step = () => {
      i += 2;
      setN(Math.min(text.length, i));
      if (i < text.length) t = setTimeout(step, 18);
    };
    t = setTimeout(step, delay);
    return () => clearTimeout(t);
  }, [text, delay, reduce]);
  return (
    <>
      <span aria-hidden="true">{text.slice(0, n)}</span>
      <span className="sr-only">{text}</span>
    </>
  );
}

export function Results({
  scanId,
  scan,
  analysis,
  onEditAnswers,
  onDeployed,
  answers,
}: {
  scanId: string;
  scan: ScanResult;
  analysis: Analysis;
  answers: Answers | null;
  onEditAnswers: () => void;
  onDeployed: (d: Deployment) => void;
}) {
  const [roast, setRoast] = useState(false);
  const [allFindings, setAllFindings] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [selected, setSelected] = useState<Workflow | null>(null);
  const bpRef = useRef<HTMLDivElement>(null);
  const k = scan.knowledge;
  const s = analysis.subScores;
  const audit = analysis.audit;
  const score = audit?.score ?? analysis.readiness;
  const after = analysis.auditAfter;

  const open = (w: Workflow) => {
    setSelected(w);
    setTimeout(() => bpRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
  };

  return (
    <div className={styles.results}>
      <section className={styles.scoreHero} aria-labelledby="score-h">
        <div className={styles.scoreLeft}>
          <p className="kicker">AI readiness · {k.name}</p>
          <h1 id="score-h" className="sr-only">
            AI readiness score: {score} out of 100
          </h1>
          <Gauge value={score} />
          {after && after.score > score && (
            <p className={styles.afterChip}>
              <span aria-hidden="true">→</span> <b>{after.score}</b> with Weblyy <span className={styles.afterGain}>+{after.score - score}</span>
            </p>
          )}
        </div>

        <div className={styles.scoreRight}>
          <p className={styles.summary}>
            5 areas checked on {k.url.includes("instagram.com") ? `@${k.instagram?.handle ?? "the profile"}` : `${k.pages.length} page${k.pages.length === 1 ? "" : "s"}`}.
          </p>
          {audit && after ? (
            <BeforeAfterChart before={audit} after={after} />
          ) : audit ? (
            <ul className={styles.cats}>
              {audit.categories.map((c, i) => (
                <motion.li key={c.key} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 + i * 0.08 }}>
                  <details>
                    <summary>
                      <span className={styles.catIcon} data-level={c.level} aria-hidden="true">
                        {c.level === "good" ? "✓" : c.level === "warn" ? "!" : "✕"}
                      </span>
                      <span className={styles.catName}>
                        <b>{c.label}</b>
                        <small>{c.summary}</small>
                      </span>
                      <span className={styles.catScore}>{c.score}</span>
                    </summary>
                    <ul className={styles.catChecks}>
                      {c.checks.map((x) => (
                        <li key={x.label} data-ok={x.ok === true ? "yes" : x.ok === "partial" ? "partial" : "no"}>
                          <b>{x.label}</b> <span className="muted">{x.detail}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                </motion.li>
              ))}
            </ul>
          ) : (
            <div className={styles.bars}>
              <Bar label="Responsiveness" hint="how fast customers hear back" value={s.responsiveness} />
              <Bar label="Channel coverage" hint="ways to reach you" value={s.coverage} />
              <Bar label="Repetitive load" hint="lower is better" value={s.repetitiveLoad} invert />
              <Bar label="Automation potential" hint="how much can be handed over" value={s.potential} />
            </div>
          )}
          <div className={styles.scoreMeta}>
            <span className="pill">
              <span className={`dot ${analysis.engine === "rules" ? "warn" : ""}`} />
              {analysis.engine === "ai" ? "Analyzed with AI" : "Instant analysis"}
            </span>
            <button className="btn btn-ghost btn-sm" onClick={onEditAnswers}>
              Refine with 4 quick questions
            </button>
          </div>
        </div>
      </section>

      {audit && after ? (
        <section className={styles.quick} aria-labelledby="fix-h">
          <h2 id="fix-h" className={styles.h2}>
            Biggest wins
          </h2>
          <TopFixes before={audit} after={after} />
          <StatTiles
            items={[
              { label: "problems found", to: audit.problems.length, tone: "bad" },
              { label: "hours back every week", to: analysis.hoursPerWeek, decimals: 1, suffix: "hrs" },
              { label: "staff time saved", to: analysis.rupeesPerMonth, prefix: "₹", suffix: "/mo" },
              ...(scan.presence?.searched ? [{ label: "places you're listed online", to: scan.presence.listings.length, tone: scan.presence.listings.length ? ("ok" as const) : ("bad" as const) }] : []),
            ]}
          />
        </section>
      ) : (
        audit && (
        <section className={styles.probs} aria-label="Problems and opportunities">
          <div className={styles.probCol}>
            <h2 className={styles.h2}>Detected problems</h2>
            <ul>
              {(audit.problems.length ? audit.problems : ["No major problems found."]).map((p) => (
                <li key={p} data-kind="problem">
                  {p}
                </li>
              ))}
            </ul>
          </div>
          <div className={styles.probCol}>
            <h2 className={styles.h2}>Opportunities</h2>
            <ul>
              {audit.opportunities.map((o) => (
                <li key={o} data-kind="opp">
                  {o}
                </li>
              ))}
            </ul>
            <div className={styles.money}>
              <div>
                <span className="muted">Hours back every week</span>
                <b>
                  <CountUp to={analysis.hoursPerWeek} decimals={1} />
                  <small> hrs</small>
                </b>
              </div>
              <div>
                <span className="muted">Staff time recoverable</span>
                <b>
                  <CountUp to={analysis.rupeesPerMonth} prefix="₹" />
                  <small> /month</small>
                </b>
              </div>
            </div>
          </div>
        </section>
        )
      )}

      {audit && <MakeReady scanId={scanId} answers={answers} audit={audit} name={k.name} />}

      <details className={styles.detailsAll}>
        <summary>
          <span>
            <b>See the detailed report</b>
            <small>Optional: every finding, where you&apos;re listed online, everything we read, and individual automations</small>
          </span>
        </summary>
      <section className={styles.findings} aria-labelledby="find-h">
          <div className={styles.findHead}>
            <h2 id="find-h" className={styles.h2}>
              {roast ? "The honest version" : "What we found"}
            </h2>
            <button className={styles.switch} role="switch" aria-checked={roast} onClick={() => setRoast(!roast)}>
              <span className={styles.switchTrack}>
                <span className={styles.switchThumb} />
              </span>
              Roast my website <span aria-hidden="true">🔥</span>
            </button>
          </div>
          <AnimatePresence mode="wait">
            {roast ? (
              <motion.ul key="roast" className={styles.roastList} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {analysis.roast.map((line, i) => (
                  <motion.li key={line} initial={{ opacity: 0, x: -12, rotate: -1 }} animate={{ opacity: 1, x: 0, rotate: 0 }} transition={{ delay: i * 0.9 }}>
                    <Typewriter text={line} delay={i * 900 + 150} />
                  </motion.li>
                ))}
              </motion.ul>
            ) : (
              <motion.ul key="plain" className={styles.findList} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {(allFindings ? analysis.findings : analysis.findings.slice(0, 3)).map((f, i) => (
                  <motion.li key={f} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    {f}
                  </motion.li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
          {!roast && analysis.findings.length > 3 && (
            <button className={`btn btn-ghost btn-sm ${styles.more}`} onClick={() => setAllFindings(!allFindings)} aria-expanded={allFindings}>
              {allFindings ? "Show less" : `Show all ${analysis.findings.length} findings`}
            </button>
          )}
        </section>
  
        {scan.presence && <WebPresencePanel presence={scan.presence} />}
  
        {showReport ? (
          <SiteReport scan={scan} analysis={analysis} />
        ) : (
          <button className={styles.reportToggle} onClick={() => setShowReport(true)} aria-expanded={false}>
            <span>
              <b>Everything we read on {k.name}</b>
              <small>
                {k.pages.length} page{k.pages.length === 1 ? "" : "s"} · {k.prices.length} prices · {k.faqs.length} FAQs · {k.phones.length + k.whatsapp.length + k.emails.length} contacts
              </small>
            </span>
            <span className="btn btn-ghost btn-sm">Open full report</span>
          </button>
        )}
  
        <section aria-labelledby="board-h" className={styles.boardWrap}>
          <div className={styles.findHead}>
            <div>
              <h2 id="board-h" className={styles.h2}>
                Automation opportunities: {analysis.workflows.length} workflows, ranked
              </h2>
              <p className="muted" style={{ margin: "4px 0 0" }}>
                Pick one to see its blueprint, or switch on a single-workflow agent.
              </p>
            </div>
          </div>
          <ul className={styles.board}>
            {analysis.workflows.map((w, i) => {
              const v = VERDICT[w.verdict];
              const isSel = selected?.id === w.id;
              return (
                <motion.li
                  key={w.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                >
                  <button
                    className={styles.wf}
                    data-selected={isSel || undefined}
                    data-verdict={w.verdict}
                    onClick={() => open(w)}
                    style={{ ["--tone" as string]: v.tone }}
                    aria-label={`${w.name}: score ${w.score}, ${v.label}. Open blueprint.`}
                  >
                    <div className={styles.wfTop}>
                      <span className={styles.wfChannel} style={{ ["--c" as string]: `var(--ch-${w.channel})` }}>
                        {CHANNEL_NAME[w.channel]}
                      </span>
                      <span className={styles.wfVerdict}>{v.label}</span>
                    </div>
                    <b className={styles.wfName}>{w.name}</b>
                    {/[?!.]$/.test(w.trigger.replace(/"$/, "")) ? (
                      <q className={styles.wfTrigger}>{w.trigger.replace(/^"|"$/g, "")}</q>
                    ) : (
                      <span className={styles.wfTrigger}>When: {w.trigger}</span>
                    )}
                    <div className={styles.wfScore}>
                      <div className={styles.wfTrack}>
                        <motion.div
                          className={styles.wfFill}
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: w.score / 100 }}
                          transition={{ duration: 0.9, delay: 0.3 + i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                        />
                      </div>
                      <span className="mono">{w.score}</span>
                    </div>
                    <span className={styles.wfHours}>{w.hoursPerWeek > 0 ? `saves ~${w.hoursPerWeek} hrs/week` : "stays with a person"}</span>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        </section>
  
        <div ref={bpRef} style={{ scrollMarginTop: 90 }}>
          <AnimatePresence mode="wait">
            {selected && (
              <motion.div key={selected.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.45 }}>
                <Blueprint scanId={scanId} scan={scan} workflow={selected} onDeployed={onDeployed} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        </details>
    </div>
  );
}
