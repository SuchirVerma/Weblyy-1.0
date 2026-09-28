"use client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { ScanEvent, ScanResult, Touchpoint } from "@/lib/types";
import { Radar } from "../radar";
import { Arrow } from "../ui";
import styles from "./scan.module.css";

type Line = { id: number; level: "info" | "ok" | "warn"; text: string };
const STAGE_LABEL = { crawl: "Crawling pages", extract: "Reading content", detect: "Mapping touchpoints", done: "Scan complete" } as const;

export function Scanning({
  url,
  done,
  onDone,
  onNext,
  busy,
  error: nextError,
}: {
  url: string;
  done: { id: string; result: ScanResult } | null;
  onDone: (id: string, r: ScanResult) => void;
  onNext: () => void;
  busy?: boolean;
  error?: string;
}) {
  const [lines, setLines] = useState<Line[]>(() =>
    done ? done.result.touchpoints.map((t, i) => ({ id: i, level: "ok" as const, text: `${t.label}: ${t.detail}` })) : [],
  );
  const [tps, setTps] = useState<Touchpoint[]>(done?.result.touchpoints ?? []);
  const [stage, setStage] = useState<keyof typeof STAGE_LABEL>(done ? "done" : "crawl");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const logRef = useRef<HTMLDivElement>(null);
  const onDoneRef = useRef(onDone);
  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    if (done && attempt === 0) return;
    const ctrl = new AbortController();
    let n = 0;
    const push = (level: Line["level"], text: string) => setLines((l) => [...l.slice(-60), { id: n++, level, text }]);

    (async () => {
      try {
        setLines([]);
        setTps([]);
        setError("");
        setStage("crawl");
        if (!url) throw new Error("No website address was given.");
        const res = await fetch("/api/scan", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ url }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) {
          const msg = await res.json().catch(() => null);
          throw new Error(msg?.error || "The scanner is unavailable right now.");
        }
        const reader = res.body.getReader();
        const dec = new TextDecoder();
        let buf = "";
        let finished = false;
        while (true) {
          const { done: end, value } = await reader.read();
          if (end) break;
          buf += dec.decode(value, { stream: true });
          let nl: number;
          while ((nl = buf.indexOf("\n")) >= 0) {
            const raw = buf.slice(0, nl).trim();
            buf = buf.slice(nl + 1);
            if (!raw) continue;
            const e = JSON.parse(raw) as ScanEvent;
            if (e.type === "log") push(e.level, e.text);
            else if (e.type === "stage") setStage(e.stage);
            else if (e.type === "touchpoint") setTps((t) => [...t, e.touchpoint]);
            else if (e.type === "error") throw new Error(e.message);
            else if (e.type === "result") {
              finished = true;
              onDoneRef.current(e.scanId, e.result);
            }
          }
        }
        if (!finished) throw new Error("The scan stopped early. Please try again.");
      } catch (e) {
        if (ctrl.signal.aborted) return;
        setError(e instanceof Error ? e.message : "Something went wrong.");
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, attempt]);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [lines.length]);

  const complete = stage === "done" && !error;
  const host = url === "demo" ? "kesar-beauty.demo" : url.replace(/^https?:\/\//, "").split("/")[0];

  return (
    <section className={styles.scanGrid} aria-labelledby="scan-h">
      <div className={styles.scanCopy}>
        <p className="kicker">{error ? "Scan failed" : STAGE_LABEL[stage]}</p>
        <h1 id="scan-h" className="h-display" style={{ fontSize: "clamp(2rem, 4.4vw, 3.4rem)" }}>
          {error ? (
            <>
              We couldn&apos;t <span className="em">read that site.</span>
            </>
          ) : complete ? (
            <>
              <span className="em">{tps.length} places</span> customers reach you.
            </>
          ) : (
            <>
              Reading <span className="em">{host}</span>
              <span className={styles.ellipsis} />
            </>
          )}
        </h1>

        <div className={styles.terminal} ref={logRef} aria-live="polite" aria-label="Scan log">
          <div className={styles.termHead} aria-hidden="true">
            <i />
            <i />
            <i />
            <span>weblyy scan {host}</span>
          </div>
          <AnimatePresence initial={false}>
            {lines.map((l) => (
              <motion.p
                key={l.id}
                data-level={l.level}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25 }}
              >
                <span aria-hidden="true">{l.level === "ok" ? "✓" : l.level === "warn" ? "!" : "›"}</span>
                {l.text}
              </motion.p>
            ))}
          </AnimatePresence>
          {!complete && !error && <p className={styles.cursor} aria-hidden="true">▍</p>}
        </div>

        {error && (
          <div className="err" role="alert">
            {error}
            <div className="chips" style={{ marginTop: 12 }}>
              <button className="btn btn-ghost btn-sm" onClick={() => setAttempt((a) => a + 1)}>
                Try again
              </button>
              <Link className="btn btn-ghost btn-sm" href="/scan?url=demo">
                Use the demo salon
              </Link>
              <Link className="btn btn-ghost btn-sm" href="/">
                Different site
              </Link>
            </div>
          </div>
        )}

        {complete && done && (
          <motion.div className={styles.scanDone} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <p className="muted" style={{ margin: 0 }}>
              <b style={{ color: "var(--text)" }}>{done.result.knowledge.name}</b> · {done.result.knowledge.businessType} · {done.result.knowledge.pages.length} pages read
              {done.result.knowledge.prices.length ? ` · ${done.result.knowledge.prices.length} prices` : ""}
            </p>
            <button className="btn btn-primary" onClick={onNext} autoFocus disabled={busy} aria-busy={busy}>
              {busy ? (
                <>
                  <span className={styles.spinner} aria-hidden="true" /> Building your report…
                </>
              ) : (
                <>
                  See my AI readiness report <Arrow />
                </>
              )}
            </button>
            {nextError && (
              <p role="alert" style={{ margin: 0, color: "var(--bad)", width: "100%" }}>
                {nextError}
              </p>
            )}
          </motion.div>
        )}
      </div>

      <div className={styles.scanRadar}>
        <Radar
          blips={tps.map((t) => ({ id: t.id, channel: t.channel, label: t.detail.length > 28 ? `${t.label}` : t.detail }))}
          scanning={!complete && !error}
          centerLabel={done?.result.knowledge.name ?? host}
        />
        <div className={styles.legend} aria-hidden="true">
          {(["whatsapp", "booking", "form", "email", "phone", "web", "social", "chat"] as const)
            .filter((c) => tps.some((t) => t.channel === c))
            .map((c) => (
              <span key={c} style={{ ["--c" as string]: `var(--ch-${c})` }}>
                {c === "web" ? "on the site" : c}
              </span>
            ))}
        </div>
      </div>
    </section>
  );
}
