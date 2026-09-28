"use client";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Analysis, Answers, ScanResult, Workflow } from "@/lib/types";
import { LiveConsole, type Deployment } from "./live-console";
import { DEFAULT_ANSWERS_UI, Questions } from "./questions";
import { Arrow } from "../ui";
import { NAV_EVENT } from "../nav-history";
import { MAKE_READY_EVENT } from "./make-ready";
import { Results } from "./results";
import { Scanning } from "./scanning";
import styles from "./scan.module.css";

type Stage = "scan" | "ask" | "score" | "live";
const STAGES: { key: Stage; label: string }[] = [
  { key: "scan", label: "Analyze" },
  { key: "ask", label: "Details" },
  { key: "score", label: "AI readiness report" },
  { key: "live", label: "Agent live" },
];

export function ScanApp({ url }: { url: string }) {
  const [stage, setStage] = useState<Stage>("scan");
  const [scan, setScan] = useState<{ id: string; result: ScanResult } | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);

  const [reporting, setReporting] = useState(false);
  const [reportError, setReportError] = useState("");

  // Each step gets its own history entry, so Back (ours or the browser's) returns to the previous step.
  const go = useCallback((s: Stage) => {
    setStage(s);
    const u = new URL(window.location.href);
    if (u.searchParams.get("step") !== s) {
      if (s === "scan") u.searchParams.delete("step");
      else u.searchParams.set("step", s);
      window.history.pushState(null, "", u);
      window.dispatchEvent(new Event(NAV_EVENT));
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // A reload restarts at the first step, so drop a leftover ?step= from the address.
  useEffect(() => {
    const u = new URL(window.location.href);
    if (u.searchParams.has("step")) {
      u.searchParams.delete("step");
      window.history.replaceState(null, "", u);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const want = (new URL(window.location.href).searchParams.get("step") ?? "scan") as Stage;
      setStage((cur) => {
        if (want === "score" && !(scan && analysis)) return "scan";
        if (want === "ask" && !scan) return "scan";
        if (want === "live" && !deployment) return analysis ? "score" : "scan";
        return STAGES.some((x) => x.key === want) ? want : cur;
      });
      window.scrollTo({ top: 0 });
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [scan, analysis, deployment]);

  const current = STAGES.findIndex((s) => s.key === stage);

  // Straight from the scan to the report, using typical answers. The owner can refine them later.
  const report = async () => {
    if (!scan) return;
    setReporting(true);
    setReportError("");
    try {
      const a = answers ?? DEFAULT_ANSWERS_UI;
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanId: scan.id, answers: a }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Couldn't build the report.");
      setAnswers(a);
      setAnalysis(d as Analysis);
      go("score");
    } catch (e) {
      setReportError(e instanceof Error ? e.message : "Couldn't build the report.");
    } finally {
      setReporting(false);
    }
  };

  return (
    <div className={`wrap ${styles.app}`}>
      <div className={styles.topRow}>
      <ol className={styles.stepper} aria-label="Progress">
        {STAGES.map((s, i) => (
          <li key={s.key} data-state={i < current ? "done" : i === current ? "now" : "todo"} aria-current={i === current ? "step" : undefined}>
            <span className={styles.stepDot}>{i < current ? "✓" : i + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>
      {stage === "score" && analysis?.audit && (
        <button className={`btn btn-primary ${styles.topCta}`} onClick={() => window.dispatchEvent(new Event(MAKE_READY_EVENT))}>
          Make My Business AI-Ready <Arrow />
        </button>
      )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={stage}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          {stage === "scan" && (
            <Scanning
              url={url}
              done={scan}
              onDone={(id, result) => setScan({ id, result })}
              onNext={report}
              busy={reporting}
              error={reportError}
            />
          )}
          {stage === "ask" && scan && (
            <Questions
              scanId={scan.id}
              scan={scan.result}
              initial={answers}
              onBack={() => go("scan")}
              onDone={(a, an) => {
                setAnswers(a);
                setAnalysis(an);
                go("score");
              }}
            />
          )}
          {stage === "score" && scan && analysis && (
            <Results
              scanId={scan.id}
              scan={scan.result}
              analysis={analysis}
              answers={answers}
              onEditAnswers={() => go("ask")}
              onDeployed={(d: Deployment) => {
                setDeployment(d);
                go("live");
              }}
            />
          )}
          {stage === "live" && scan && deployment && (
            <LiveConsole scan={scan.result} deployment={deployment} onBack={() => go("score")} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export type { Workflow };
