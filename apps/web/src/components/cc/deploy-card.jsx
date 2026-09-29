"use client";
import QRCode from "qrcode";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useReducedSafe } from "../use-reduced";
import styles from "./deploy-card.module.css";
const STEPS = [
  { t: "Preparing your pages", d: "Home, services, about, gallery, FAQ and contact" },
  { t: "Switching on your AI agent", d: "Answers from your prices, hours and FAQs" },
  { t: "Adding your details for Google", d: "Business data, FAQs and page titles" },
  { t: "Setting up hosting", d: "Your own link, secure and mobile-ready" },
  { t: "Going live", d: "Your new website is online" },
];
const ago = (t) => new Date(t).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
/** Publishes the redesigned website and hands the owner its hosting link. */
export function DeployCard({ data, act }) {
  const reduce = useReducedSafe();
  const [origin, setOrigin] = useState("");
  const [phase, setPhase] = useState(data.published ? "live" : "idle");
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState("");
  const published = data.published;
  const link = origin ? `${origin}${data.links.sitePath}` : "";
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setOrigin(s.publicOrigin || window.location.origin))
      .catch(() => setOrigin(window.location.origin));
  }, []);
  useEffect(() => {
    if (!link || phase !== "live") return;
    QRCode.toDataURL(link, { margin: 1, width: 480, color: { dark: "#111827", light: "#ffffff" } })
      .then(setQr)
      .catch(() => {});
  }, [link, phase]);
  const deploy = async () => {
    setError("");
    setPhase("deploying");
    setStep(0);
    const pace = reduce ? 0 : 750;
    const tick = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), pace || 1);
    const started = Date.now();
    try {
      await act({ action: "publish" });
      const wait = STEPS.length * pace - (Date.now() - started);
      if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      clearInterval(tick);
      setStep(STEPS.length);
      setPhase("live");
    } catch (e) {
      clearInterval(tick);
      setError(e instanceof Error ? e.message : "Couldn't deploy. Please try again.");
      setPhase(published ? "live" : "idle");
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  const isLocal = /localhost|127\.0\.0\.1/.test(origin);
  return (
    <section className={styles.card} data-phase={phase} aria-labelledby="deploy-h">
      <div className={styles.head}>
        <div>
          <p className="kicker">{phase === "live" ? "Live" : "Deploy"}</p>
          <h2 id="deploy-h">{phase === "live" ? "Your new website is live." : "Put your new website online."}</h2>
          <p className="muted">
            {phase === "live"
              ? `Share this link anywhere: Instagram bio, Google Maps listing, WhatsApp, visiting cards.${published ? ` Last deployed ${ago(published.at)}.` : ""}`
              : "One click publishes the new 3D design with your AI agent built in, and gives you a hosting link. No coding, no hosting account needed."}
          </p>
        </div>
        {phase === "idle" && (
          <button className="btn btn-primary" onClick={deploy}>
            Deploy my new website →
          </button>
        )}
        {phase === "live" && (
          <button className="btn btn-ghost btn-sm" onClick={deploy}>
            Deploy again
          </button>
        )}
      </div>
      {error && (
        <p className="err" role="alert">
          {error}
        </p>
      )}
      <AnimatePresence mode="wait">
        {phase === "deploying" && (
          <motion.ol key="steps" className={styles.steps} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} role="status" aria-live="polite">
            {STEPS.map((s, i) => (
              <li key={s.t} data-state={i < step ? "done" : i === step ? "now" : "todo"}>
                <span aria-hidden="true">{i < step ? "✓" : ""}</span>
                <div>
                  <b>{s.t}</b>
                  <small>{s.d}</small>
                </div>
              </li>
            ))}
            <li className={styles.bar} aria-hidden="true">
              <motion.i animate={{ width: `${(Math.min(step + 1, STEPS.length) / STEPS.length) * 100}%` }} transition={{ duration: 0.6 }} />
            </li>
          </motion.ol>
        )}
        {phase === "live" && link && (
          <motion.div key="live" className={styles.live} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <div className={styles.linkBox}>
              <span className={styles.dot} aria-hidden="true" />
              <a href={link} target="_blank" rel="noreferrer" className={styles.url}>
                {link.replace(/^https?:\/\//, "")}
              </a>
              <div className={styles.actions}>
                <button className="btn btn-primary btn-sm" onClick={copy}>
                  {copied ? "Copied ✓" : "Copy link"}
                </button>
                <a className="btn btn-ghost btn-sm" href={link} target="_blank" rel="noreferrer">
                  Open ↗
                </a>
                <a
                  className="btn btn-ghost btn-sm"
                  href={`https://wa.me/?text=${encodeURIComponent(`Our new website: ${link}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Share on WhatsApp
                </a>
              </div>
            </div>
            <div className={styles.more}>
              {qr && (
                <figure className={styles.qr}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qr} alt="QR code for your new website" />
                  <figcaption>Scan to open</figcaption>
                </figure>
              )}
              <ul className={styles.facts}>
                <li>
                  <b>Included:</b> new 3D design, every page, AI agent, booking form, Google data
                </li>
                <li>
                  <b>Updates:</b> change your prices or timings, scan again, and press Deploy again
                </li>
                <li>
                  <b>Your own domain</b> (like yourbusiness.com): request the free setup in Go live and our team connects it
                </li>
              </ul>
            </div>
            {isLocal && <p className={styles.note}>You are running Weblyy on this computer, so this link works here only. On the live Weblyy site, it works for everyone.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
