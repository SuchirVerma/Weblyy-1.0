"use client";
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useRef, useState } from "react";
import type { ScanResult, Workflow } from "@/lib/types";
import { CHANNEL_NAME } from "../radar";
import type { Deployment } from "./live-console";
import styles from "./scan.module.css";

const HOLD_MS = 1300;

function HoldToDeploy({ onComplete, busy }: { onComplete: () => void; busy: boolean }) {
  const reduce = useReducedMotion();
  const progress = useMotionValue(0);
  const width = useTransform(progress, (p) => `${p * 100}%`);
  const ctrl = useRef<ReturnType<typeof animate> | null>(null);
  const [holding, setHolding] = useState(false);

  const start = () => {
    if (busy) return;
    if (reduce) return onComplete();
    setHolding(true);
    ctrl.current?.stop();
    const remaining = HOLD_MS * (1 - progress.get());
    ctrl.current = animate(progress, 1, {
      duration: remaining / 1000,
      ease: "linear",
      onComplete: () => {
        setHolding(false);
        onComplete();
      },
    });
  };
  const release = () => {
    if (!holding) return;
    setHolding(false);
    ctrl.current?.stop();
    if (progress.get() < 1) ctrl.current = animate(progress, 0, { duration: 0.45, ease: [0.22, 1, 0.36, 1] });
  };

  return (
    <button
      type="button"
      className={styles.hold}
      data-holding={holding || undefined}
      disabled={busy}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        start();
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onKeyDown={(e) => {
        if ((e.key === " " || e.key === "Enter") && !e.repeat) {
          e.preventDefault();
          start();
        }
      }}
      onKeyUp={(e) => {
        if (e.key === " " || e.key === "Enter") release();
      }}
      onClick={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={reduce ? "Switch the agent on" : "Press and hold to switch the agent on"}
    >
      <motion.span className={styles.holdFill} style={{ width }} aria-hidden="true" />
      <span className={styles.holdLabel}>
        {busy ? (
          <>
            <span className={styles.spinner} aria-hidden="true" /> Switching the agent on…
          </>
        ) : holding ? (
          "Keep holding…"
        ) : reduce ? (
          "Switch the agent on"
        ) : (
          "Hold to switch the agent on"
        )}
      </span>
    </button>
  );
}

export function Blueprint({
  scanId,
  scan,
  workflow: w,
  onDeployed,
}: {
  scanId: string;
  scan: ScanResult;
  workflow: Workflow;
  onDeployed: (d: Deployment) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const human = w.verdict === "human";

  const steps = [
    { kind: "trigger", title: "Customer writes", body: w.trigger.replace(/^"|"$/g, "") },
    ...w.agentSteps.map((s) => ({ kind: "step", title: "Agent", body: s })),
    { kind: "handoff", title: human ? "Owner takes over" : "Owner, only if needed", body: human ? "Alert on the owner's phone" : "Anything unusual gets escalated" },
  ];

  const prompt = `You are the WhatsApp assistant for ${scan.knowledge.name}, handling "${w.name}".\n\n${w.agentSteps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nRules:\n${w.guardrails.map((g) => `- ${g}`).join("\n")}`;

  const deploy = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/deploy", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scanId, workflow: w }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Deploy failed.");
      await new Promise((r) => setTimeout(r, 500));
      onDeployed({ ...data, workflow: w } as Deployment);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Deploy failed.");
      setBusy(false);
    }
  };

  return (
    <section className={styles.blueprint} aria-labelledby="bp-h">
      <div className={styles.bpHead}>
        <div>
          <p className="kicker">Blueprint · {CHANNEL_NAME[w.channel]}</p>
          <h2 id="bp-h" className={styles.h2} style={{ fontSize: "clamp(1.6rem, 3vw, 2.3rem)" }}>
            {w.name}
          </h2>
          <p className="muted" style={{ margin: "6px 0 0", maxWidth: "60ch" }}>
            {w.description} {w.reason}
          </p>
        </div>
      </div>

      <ol className={styles.flow} aria-label="How the agent handles it">
        {steps.map((s, i) => (
          <motion.li
            key={i}
            data-kind={s.kind}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 * i, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className={styles.flowTitle}>{s.title}</span>
            <span>{s.body}</span>
          </motion.li>
        ))}
      </ol>

      <div className={styles.bpGrid}>
        <div className={styles.bpCard}>
          <h3>Why it scored {w.score}</h3>
          <div className={styles.calc}>
            {[
              ["Volume", w.volume],
              ["Repetitiveness", w.repetitiveness],
              ["Data on site", w.dataAvailability],
              ["1 − Risk", 1 - w.risk],
            ].map(([label, val], i) => (
              <div key={label as string} className={styles.calcRow}>
                <span>{label}</span>
                <span className={styles.calcTrack}>
                  <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: val as number }} transition={{ delay: 0.3 + i * 0.1, duration: 0.8 }} />
                </span>
                <b className="mono">{(val as number).toFixed(2)}</b>
              </div>
            ))}
            <p className="mono muted" style={{ margin: "8px 0 0", fontSize: ".8rem" }}>
              {w.volume.toFixed(2)} × {w.repetitiveness.toFixed(2)} × {w.dataAvailability.toFixed(2)} × {(1 - w.risk).toFixed(2)} × 100 ={" "}
              <b style={{ color: "var(--text)" }}>{w.score}</b>
            </p>
          </div>
        </div>
        <div className={styles.bpCard}>
          <h3>Guardrails</h3>
          <ul className={styles.guards}>
            {w.guardrails.map((g) => (
              <li key={g}>{g}</li>
            ))}
            <li>Answers only from {scan.knowledge.name}&apos;s own website</li>
          </ul>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginTop: 14 }}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(prompt);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
              } catch {
                /* clipboard blocked */
              }
            }}
          >
            {copied ? "Copied ✓" : "Copy agent instructions"}
          </button>
        </div>
      </div>

      <div className={styles.deployRow}>
        <div>
          <b>{human ? "This one stays with a person." : "Ready when you are."}</b>
          <p className="muted" style={{ margin: "4px 0 0", fontSize: ".92rem" }}>
            {human
              ? "Switching the agent on still helps: it answers everything else and alerts the owner the moment a complaint arrives."
              : "The agent goes live with a chat link, a QR code for customers, a WhatsApp webhook and an n8n workflow."}
          </p>
        </div>
        <HoldToDeploy onComplete={deploy} busy={busy} />
      </div>
      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
