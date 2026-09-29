"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useReducedSafe } from "../use-reduced";
import styles from "./site-compare.module.css";
const STEPS = [
  { key: "open", label: "Opening your website" },
  { key: "pages", label: "Reading every page" },
  { key: "design", label: "Keeping your design exactly as it is" },
  { key: "assistant", label: "Writing in the AI assistant" },
  { key: "actions", label: "Adding Call, WhatsApp and Book buttons" },
  { key: "booking", label: "Connecting the booking form" },
  { key: "search", label: "Adding your details for Google and AI apps" },
  { key: "test", label: "Testing every button" },
  { key: "ready", label: "Starting your improved website" },
];
// Code lines shown going into their site at each step.
const INSERTS = {
  assistant: '+ <script src="/widget.js" data-agent="…">',
  actions: '+ <script src="/weblyy-addons.js" data-config="…">',
  search: '+ <script type="application/ld+json">{"@type":"LocalBusiness",…}',
};
const PACE = 360; // ms between steps on screen, so each one can be read
const built = new Map(); // per visit: switching tabs doesn't rebuild
const mmss = (ms) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
/** "Your current website" next to "With Weblyy": the business's real site, and the same site with the add-ons written in. */
export function SiteCompare({ agentId, host, fallbackPath, design }) {
  const reduce = useReducedSafe();
  const [view, setView] = useState("original");
  const [device, setDevice] = useState("desktop");
  const [highlight, setHighlight] = useState(true);
  const [phase, setPhase] = useState(built.has(agentId) ? "ready" : "idle");
  const [summary, setSummary] = useState(built.get(agentId) ?? null);
  const [error, setError] = useState("");
  const [steps, setSteps] = useState({});
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState(9000);
  const [code, setCode] = useState([]);
  const [reveal, setReveal] = useState(0);
  const queue = useRef([]);
  const etaAt = useRef({ ms: 9000, t: 0 });
  const originalSrc = `/mirror/${agentId}/original/`;
  const enhancedSrc = `${summary?.enhancedPath ?? `/mirror/${agentId}/enhanced/`}${highlight ? "?wb_highlight=1" : ""}`;
  // Countdown ticks between server updates; it also counts what is still queued to show.
  useEffect(() => {
    if (phase !== "building") return;
    const t = setInterval(() => {
      const server = etaAt.current.ms - (Date.now() - etaAt.current.t);
      setEta(Math.max(0, server, queue.current.length * PACE));
    }, 100);
    return () => clearInterval(t);
  }, [phase]);
  const build = async () => {
    setPhase("building");
    setError("");
    setSteps({});
    setProgress(0);
    setCode([{ text: `<!-- ${host} -->` }]);
    queue.current = [];
    etaAt.current = { ms: 9000, t: Date.now() };
    setEta(9000);
    let finished = null;
    let failed = "";
    let streamDone = false;
    // Show events one by one at a readable pace, whatever speed the server works at.
    const player = (async () => {
      for (;;) {
        const ev = queue.current.shift();
        if (!ev) {
          if (streamDone) return;
          await new Promise((r) => setTimeout(r, 60));
          continue;
        }
        if (ev.sample) {
          setCode((c) => [...c, ...ev.sample.map((text) => ({ text }))].slice(-14));
          continue;
        }
        if (ev.step && ev.step !== "code") {
          const key = ev.step;
          setSteps((s) => ({ ...s, [key]: { status: ev.status ?? "run", detail: ev.detail ?? "" } }));
          if (ev.status === "ok" && INSERTS[key]) setCode((c) => [...c, { text: INSERTS[key], added: true }].slice(-14));
        }
        if (typeof ev.progress === "number") setProgress((p) => Math.max(p, ev.progress));
        if (typeof ev.etaMs === "number") etaAt.current = { ms: ev.etaMs, t: Date.now() };
        await new Promise((r) => setTimeout(r, reduce ? 0 : PACE));
      }
    })();
    try {
      const res = await fetch(`/api/enhance/${agentId}`, { cache: "no-store" });
      if (res.status === 409) {
        setPhase("no-site");
        return;
      }
      if (!res.ok || !res.body) throw new Error("Couldn't start. Please try again.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          let ev;
          try {
            ev = JSON.parse(line);
          } catch {
            continue;
          }
          if (ev.error) failed = ev.error;
          else if (ev.done)
            finished = {
              seconds: ev.seconds ?? 0,
              pages: ev.pages ?? 1,
              host: ev.host ?? host,
              spa: Boolean(ev.spa),
              originalPath: ev.originalPath,
              enhancedPath: ev.enhancedPath,
              added: ev.added ?? [],
            };
          else queue.current.push(ev);
        }
      }
    } catch (e) {
      failed = e instanceof Error ? e.message : "The connection dropped. Please try again.";
    } finally {
      streamDone = true;
    }
    await player;
    if (failed || !finished) {
      setError(failed || "Something went wrong while building. Please try again.");
      setPhase("error");
      return;
    }
    built.set(agentId, finished);
    setSummary(finished);
    setProgress(1);
    setEta(0);
    await new Promise((r) => setTimeout(r, reduce ? 0 : 500));
    setPhase("ready");
    setView("enhanced");
    setReveal((n) => n + 1);
  };
  const show = (v) => {
    if (v === "enhanced" && phase !== "ready") {
      if (phase !== "building") void build();
      return;
    }
    setView(v);
    if (v === "enhanced" || v === "redesign") setReveal((n) => n + 1);
  };
  const scene = design?.key ?? "flow";
  const redesignSrc = fallbackPath;
  const path = view === "original" ? (summary?.originalPath ?? "/") : view === "enhanced" ? (summary?.enhancedPath ?? "/") : "/";
  const addressPath = path.replace(/^\/mirror\/[^/]+\/(original|enhanced)\//, "/");
  if (phase === "no-site") {
    return (
      <section className={styles.wrap}>
        <div className={styles.noSite}>
          <b>This business has no website yet</b>
          <span>We only found an Instagram profile, so there was no existing site to improve. Here is the website Weblyy built for it.</span>
        </div>
        <div className={styles.frame} data-device={device}>
          <iframe src={fallbackPath} title="Website built by Weblyy" />
        </div>
      </section>
    );
  }
  return (
    <section className={styles.wrap} aria-label="Your website before and after Weblyy">
      <div className={styles.switch} role="tablist" aria-label="Which version">
        <button role="tab" aria-selected={view === "original"} onClick={() => show("original")}>
          <span className={styles.swIcon} aria-hidden="true">
            ◐
          </span>
          <span>
            <b>Your current website</b>
            <small>Exactly as it is today</small>
          </span>
        </button>
        <button role="tab" aria-selected={view === "enhanced"} onClick={() => show("enhanced")} data-accent>
          <span className={styles.swIcon} aria-hidden="true">
            ✦
          </span>
          <span>
            <b>With Weblyy</b>
            <small>{phase === "ready" ? "Same site, add-ons written in" : phase === "building" ? "Building now…" : "Quick upgrade, tap to build"}</small>
          </span>
        </button>
        <button role="tab" aria-selected={view === "redesign"} onClick={() => show("redesign")} data-accent>
          <span className={styles.swIcon} aria-hidden="true">
            ◆
          </span>
          <span>
            <b>New website</b>
            <small>New 3D design + AI agent</small>
          </span>
        </button>
        <span className={styles.swPill} data-side={view} aria-hidden="true" />
      </div>

      {view === "redesign" && design && (
        <div className={styles.designBar}>
          <span className={styles.designPick}>
            <b>◆ 3D design: {design.name}</b>
            <small>
              Weblyy picked this for your business because {design.reason}.
            </small>
          </span>
        </div>
      )}
      <div className={styles.browser}>
        <div className={styles.bar}>
          <span className={styles.dots} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <span className={styles.address}>
            <span aria-hidden="true">🔒</span> {view === "redesign" ? `${host} · new design` : summary?.host ?? host}
            {view !== "redesign" && addressPath !== "/" ? addressPath : ""}
            {view === "enhanced" && <em>+ Weblyy</em>}
            {view === "redesign" && <em>Redesigned by Weblyy</em>}
          </span>
          <div className={styles.tools}>
            {view === "enhanced" && phase === "ready" && (
              <button className={styles.tool} aria-pressed={highlight} onClick={() => setHighlight((h) => !h)}>
                {highlight ? "Hide labels" : "Show what's new"}
              </button>
            )}
            <button className={styles.tool} aria-pressed={device === "mobile"} onClick={() => setDevice((d) => (d === "desktop" ? "mobile" : "desktop"))}>
              {device === "desktop" ? "📱 Phone" : "🖥 Desktop"}
            </button>
            <a className={styles.tool} href={view === "original" ? originalSrc : view === "enhanced" ? enhancedSrc : redesignSrc} target="_blank" rel="noreferrer">
              Open ↗
            </a>
          </div>
        </div>

        <div className={styles.frame} data-device={device}>
          <iframe key="original" src={originalSrc} title="Your current website" hidden={view !== "original"} />
          {phase === "ready" && (
            <motion.div
              key={`enhanced-${reveal}`}
              className={styles.enhancedLayer}
              hidden={view !== "enhanced"}
              initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
            >
              <iframe src={enhancedSrc} title="Your website with Weblyy" />
              {!reduce && (
                <motion.span
                  className={styles.wipe}
                  initial={{ left: "0%" }}
                  animate={{ left: "100%", opacity: [1, 1, 0] }}
                  transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
                  aria-hidden="true"
                />
              )}
            </motion.div>
          )}

          {view === "redesign" && (
            <motion.div
              key={`redesign-${reveal}-${scene}`}
              className={styles.enhancedLayer}
              initial={reduce ? false : { clipPath: "inset(0 100% 0 0)" }}
              animate={{ clipPath: "inset(0 0% 0 0)" }}
              transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
            >
              <iframe src={redesignSrc} title="Your new website" />
              {!reduce && (
                <motion.span
                  className={styles.wipe}
                  initial={{ left: "0%" }}
                  animate={{ left: "100%", opacity: [1, 1, 0] }}
                  transition={{ duration: 1, ease: [0.65, 0, 0.35, 1] }}
                  aria-hidden="true"
                />
              )}
            </motion.div>
          )}
          <AnimatePresence>
            {(phase === "building" || phase === "error") && view !== "redesign" && (
              <motion.div
                className={styles.loader}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.35 }}
                role="status"
                aria-live="polite"
              >
                <div className={styles.lTop}>
                  <div className={styles.clock}>
                    <small>{phase === "error" ? "Stopped" : progress >= 1 ? "Ready" : "Time left"}</small>
                    <b>{phase === "error" ? "--:--" : mmss(eta)}</b>
                    <span className={styles.pct}>{Math.round(progress * 100)}%</span>
                  </div>
                  <div className={styles.track} aria-hidden="true">
                    <motion.i animate={{ width: `${Math.max(3, progress * 100)}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
                  </div>
                </div>

                <div className={styles.lBody}>
                  <div className={styles.code} aria-hidden="true">
                    <div className={styles.codeBar}>
                      <i />
                      <i />
                      <i />
                      <span>{host} · index.html</span>
                    </div>
                    <div className={styles.codeLines}>
                      {code.map((l, i) => (
                        <motion.div
                          key={`${i}-${l.text}`}
                          className={styles.line}
                          data-added={l.added || undefined}
                          initial={{ opacity: 0, x: l.added ? 12 : 0, y: l.added ? 0 : 6 }}
                          animate={{ opacity: 1, x: 0, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <span className={styles.ln}>{i + 1}</span>
                          {l.text}
                        </motion.div>
                      ))}
                      {phase === "building" && <span className={styles.caret} />}
                    </div>
                    {phase === "building" && <span className={styles.scan} />}
                  </div>

                  <ol className={styles.steps}>
                    {STEPS.map((s) => {
                      const st = steps[s.key];
                      const state = st ? (st.status === "run" ? "run" : st.status === "warn" ? "warn" : "ok") : "todo";
                      return (
                        <li key={s.key} data-state={state}>
                          <span className={styles.dot} aria-hidden="true">
                            {state === "ok" ? "✓" : state === "warn" ? "!" : ""}
                          </span>
                          <span>
                            <b>{s.label}</b>
                            {st?.detail && <small>{st.detail}</small>}
                          </span>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {phase === "error" && (
                  <div className={styles.err}>
                    <span>{error}</span>
                    <button className="btn btn-primary btn-sm" onClick={() => void build()}>
                      Try again
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPhase("idle")}>
                      Back to current website
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {phase === "ready" && summary && (
        <motion.div className={styles.summary} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <span className={styles.sumMain}>
            ✦ Built in <b>{summary.seconds < 1 ? "under a second" : `${summary.seconds}s`}</b> · {summary.pages} page{summary.pages === 1 ? "" : "s"} of{" "}
            {summary.host}, design untouched
          </span>
          <span className={styles.chips}>
            <i>AI assistant</i>
            <i>Quick contact buttons</i>
            <i>Booking form</i>
            {(summary.added.includes("structured-data") || summary.added.includes("meta-description")) && <i>Google &amp; AI info</i>}
          </span>
          {summary.spa && (
            <small>This site is built with JavaScript, so the preview shows how it looks in a browser; its own scripts run on the real site.</small>
          )}
        </motion.div>
      )}
      {phase === "idle" && (
        <p className={styles.hint}>
          This is your real website, running here. Tap <b>With Weblyy</b> for a quick upgrade of this site, or <b>New website</b> to see your new 3D design.
        </p>
      )}
    </section>
  );
}
