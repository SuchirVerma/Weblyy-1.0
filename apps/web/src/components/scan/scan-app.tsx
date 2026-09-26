"use client";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import type { Analysis, Answers, ScanResult, Workflow } from "@/lib/types";
import { LiveConsole, type Deployment } from "./live-console";
import { Questions } from "./questions";
import { Results } from "./results";
import { Scanning } from "./scanning";
import styles from "./scan.module.css";

type Stage = "scan" | "ask" | "score" | "live";
const STAGES: { key: Stage; label: string }[] = [
  { key: "scan", label: "Scan" },
  { key: "ask", label: "Ask" },
  { key: "score", label: "Score" },
  { key: "live", label: "Deploy" },
];

export function ScanApp({ url }: { url: string }) {
  const [stage, setStage] = useState<Stage>("scan");
  const [scan, setScan] = useState<{ id: string; result: ScanResult } | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [answers, setAnswers] = useState<Answers | null>(null);
  const [deployment, setDeployment] = useState<Deployment | null>(null);

  const go = useCallback((s: Stage) => {
    setStage(s);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const current = STAGES.findIndex((s) => s.key === stage);

  return (
    <div className={`wrap ${styles.app}`}>
      <ol className={styles.stepper} aria-label="Progress">
        {STAGES.map((s, i) => (
          <li key={s.key} data-state={i < current ? "done" : i === current ? "now" : "todo"} aria-current={i === current ? "step" : undefined}>
            <span className={styles.stepDot}>{i < current ? "✓" : i + 1}</span>
            {s.label}
          </li>
        ))}
      </ol>

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
              onNext={() => go("ask")}
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
