"use client";
import { AnimatePresence, motion } from "motion/react";
import QRCode from "qrcode";
import { useEffect, useRef, useState } from "react";
import type { AgentReply, ScanResult, Workflow } from "@/lib/types";
import { OwnerInbox } from "../owner-inbox";
import { PhoneChat } from "../phone-chat";
import styles from "./scan.module.css";

export interface Deployment {
  agentId: string;
  chatPath: string;
  ownerKey: string;
  ownerPath: string;
  whatsappWebhook: string;
  n8n: unknown;
  n8nResult: { deployed: boolean; note: string };
  systemPrompt: string;
  workflow: Workflow;
}

interface AgentInfo {
  name: string;
  stats: { messages: number; escalations: number; customers: number };
  suggestions: string[];
  log: { at: number; from: string; text: string; reply: string; intent: string; escalate: boolean; source: string }[];
}

const INTENT_LABEL: Record<string, string> = {
  price: "Price question",
  booking: "Booking request",
  hours: "Timings",
  location: "Location",
  service_info: "Service question",
  complaint: "Complaint",
  refund: "Refund request",
  medical: "Medical question",
  owner: "Waiting for the owner",
  greeting: "Greeting",
  other: "Other",
};

function Stat({ label, value, tone }: { label: string; value: number | string; tone?: string }) {
  return (
    <div className={styles.liveStat}>
      <motion.b key={String(value)} initial={{ y: -8, opacity: 0.3 }} animate={{ y: 0, opacity: 1 }} style={{ color: tone }}>
        {value}
      </motion.b>
      <span className="muted">{label}</span>
    </div>
  );
}

export function LiveConsole({ scan, deployment, onBack }: { scan: ScanResult; deployment: Deployment; onBack: () => void }) {
  const k = scan.knowledge;
  const [info, setInfo] = useState<AgentInfo | null>(null);
  const [last, setLast] = useState<{ r: AgentReply; ms: number; text: string } | null>(null);
  const [alert, setAlert] = useState<{ text: string; from: string } | null>(null);
  const [qr, setQr] = useState("");
  const [chatUrl, setChatUrl] = useState("");
  const [isLocal, setIsLocal] = useState(false);
  const [copied, setCopied] = useState("");
  const seenEsc = useRef(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/status")
      .then((r) => r.json())
      .catch(() => ({}))
      .then(async (s: { publicOrigin?: string | null }) => {
        const origin = s.publicOrigin || window.location.origin;
        const url = `${origin}${deployment.chatPath}`;
        const data = await QRCode.toDataURL(url, { margin: 1, width: 420, color: { dark: "#111827", light: "#ffffff" } });
        if (!alive) return;
        setChatUrl(url);
        setQr(data);
        setIsLocal(/localhost|127\.0\.0\.1/.test(origin));
      });
    return () => {
      alive = false;
    };
  }, [deployment.chatPath]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/agents/${deployment.agentId}`, { cache: "no-store" });
        if (res.ok) {
          const d = (await res.json()) as AgentInfo;
          if (!alive) return;
          setInfo(d);
          if (d.stats.escalations > seenEsc.current) {
            const esc = [...d.log].reverse().find((l) => l.escalate);
            if (esc) setAlert({ text: esc.text, from: esc.from });
            seenEsc.current = d.stats.escalations;
          }
        }
      } catch {
        /* keep polling */
      }
      if (alive) timer = setTimeout(poll, 2000);
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [deployment.agentId]);

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(() => setAlert(null), 6000);
    return () => clearTimeout(t);
  }, [alert]);

  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  const downloadN8n = () => {
    const blob = new Blob([JSON.stringify(deployment.n8n, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `flowscout-${k.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-n8n.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };

  const stats = info?.stats ?? { messages: 0, escalations: 0, customers: 0 };
  const audience = (info?.log ?? []).filter((l) => l.from !== "presenter").slice(-6).reverse();

  return (
    <div className={styles.live}>
      <div className={styles.liveHead}>
        <div>
          <p className="kicker">
            <span className="dot" style={{ display: "inline-block", marginRight: 8 }} />
            Agent live
          </p>
          <h1 className="h-display" style={{ fontSize: "clamp(1.9rem, 4vw, 3rem)" }}>
            <span className="em">{k.name}&apos;s assistant</span> is answering.
          </h1>
          <p className="muted" style={{ margin: "8px 0 0" }}>
            Started from the &ldquo;{deployment.workflow.name}&rdquo; blueprint. It handles every question, and hands the risky ones to the owner.
          </p>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          ← Back to the score
        </button>
      </div>

      <div className={styles.liveStats}>
        <Stat label="messages answered" value={stats.messages} />
        <Stat label="sent to the owner" value={stats.escalations} tone={stats.escalations ? "var(--warn)" : undefined} />
        <Stat label="people chatting" value={stats.customers} />
        <Stat label="minutes of typing saved" value={stats.messages * 2} tone="var(--ok)" />
      </div>

      <div className={styles.liveGrid}>
        <div className={styles.livePhone}>
          <PhoneChat
            agentId={deployment.agentId}
            name={k.name}
            suggestions={info?.suggestions ?? ["Price kya hai?", "Saturday 4pm free hai?", "Kab tak khule ho?", "I want a refund"]}
            from="presenter"
            onReply={(r, ms, text) => setLast({ r, ms, text })}
          />
          <AnimatePresence>
            {alert && (
              <motion.div
                className={styles.alert}
                role="status"
                initial={{ opacity: 0, y: -24, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ type: "spring", stiffness: 360, damping: 26 }}
              >
                <span aria-hidden="true">🔔</span>
                <div>
                  <b>Owner alerted</b>
                  <span>&ldquo;{alert.text.slice(0, 80)}&rdquo;</span>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => document.getElementById("owner-inbox")?.scrollIntoView({ behavior: "smooth", block: "start" })}
                >
                  Reply
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className={styles.liveSide}>
          <div className={styles.brain}>
            <h2>What the agent just did</h2>
            {last ? (
              <dl>
                <div>
                  <dt>Customer said</dt>
                  <dd>&ldquo;{last.text}&rdquo;</dd>
                </div>
                <div>
                  <dt>Understood as</dt>
                  <dd>{INTENT_LABEL[last.r.intent] ?? last.r.intent}</dd>
                </div>
                <div>
                  <dt>Answered from</dt>
                  <dd>{last.r.source === "none" ? "Nothing on the site, so it asked the team" : last.r.source}</dd>
                </div>
                <div>
                  <dt>Owner needed?</dt>
                  <dd style={{ color: last.r.intent === "owner" || last.r.escalate ? "var(--warn)" : "var(--ok)" }}>
                    {last.r.intent === "owner" ? "Owner is handling this chat" : last.r.escalate ? "Yes, alert sent" : "No, fully handled"}
                  </dd>
                </div>
                <div>
                  <dt>Reply time</dt>
                  <dd className="mono">
                    {(last.ms / 1000).toFixed(1)}s · {last.r.engine === "ai" ? "AI" : "rules engine"}
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Send a message from the phone. Try a price, a slot, or a complaint.
              </p>
            )}
          </div>

          <div className={styles.qrCard}>
            <div className={styles.qrImg}>
              {qr ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qr} alt={`QR code that opens the chat at ${chatUrl}`} width={170} height={170} />
              ) : (
                <span className={styles.spinner} />
              )}
            </div>
            <div>
              <h2>Audience, scan this</h2>
              <p className="muted">Chat with the agent from your own phone. Every message shows up here live.</p>
              {isLocal && <p className={styles.warnNote}>Running on localhost, so phones can&apos;t open this. Set APP_URL or use a tunnel.</p>}
              <button className="btn btn-ghost btn-sm" onClick={() => copy("link", chatUrl)} disabled={!chatUrl}>
                {copied === "link" ? "Copied ✓" : "Copy chat link"}
              </button>
            </div>
          </div>

          <div className={styles.feed}>
            <h2>From the audience</h2>
            {audience.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>
                Waiting for the first message…
              </p>
            ) : (
              <ul>
                <AnimatePresence initial={false}>
                  {audience.map((l) => (
                    <motion.li key={`${l.at}-${l.from}`} layout initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }}>
                      <span className={styles.feedIntent} data-esc={l.escalate || undefined}>
                        {INTENT_LABEL[l.intent] ?? l.intent}
                      </span>
                      <span>&ldquo;{l.text}&rdquo;</span>
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
        </div>
      </div>

      <section id="owner-inbox" className={styles.ownerSection} aria-label="Owner inbox">
        <div className={styles.ownerHead}>
          <p className="muted" style={{ margin: 0, maxWidth: "62ch" }}>
            Everything customers send lands here. When the agent flags a chat, the owner answers it personally, and the reply shows up in that
            customer&apos;s chat right away. Replying pauses the agent for that customer until you hand it back.
          </p>
          <div className="chips">
            <a className="btn btn-ghost btn-sm" href={deployment.ownerPath} target="_blank" rel="noreferrer">
              Open on the owner&apos;s phone
            </a>
            <button className="btn btn-ghost btn-sm" onClick={() => copy("owner", `${chatUrl.replace(deployment.chatPath, "")}${deployment.ownerPath}`)} disabled={!chatUrl}>
              {copied === "owner" ? "Copied ✓" : "Copy owner link"}
            </button>
          </div>
        </div>
        <OwnerInbox agentId={deployment.agentId} ownerKey={deployment.ownerKey} />
      </section>

      <section className={styles.integrations} aria-labelledby="int-h">
        <h2 id="int-h" className={styles.h2} style={{ fontSize: "1.5rem" }}>
          Plug it into real channels
        </h2>
        <div className={styles.intGrid}>
          <div className={styles.bpCard}>
            <h3>n8n workflow</h3>
            <p className="muted">WhatsApp in, agent reply out, owner alert on escalation. {deployment.n8nResult.note}</p>
            <button className="btn btn-ghost btn-sm" onClick={downloadN8n}>
              Download n8n JSON
            </button>
          </div>
          <div className={styles.bpCard}>
            <h3>Twilio WhatsApp webhook</h3>
            <p className="muted">Paste this into the sandbox&apos;s &ldquo;When a message comes in&rdquo; field.</p>
            <code className={styles.code}>{deployment.whatsappWebhook}</code>
            <button className="btn btn-ghost btn-sm" onClick={() => copy("hook", deployment.whatsappWebhook)}>
              {copied === "hook" ? "Copied ✓" : "Copy webhook URL"}
            </button>
          </div>
          <div className={styles.bpCard}>
            <h3>Agent instructions</h3>
            <p className="muted">The exact rules this agent follows, ready for any LLM platform.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => copy("prompt", deployment.systemPrompt)}>
              {copied === "prompt" ? "Copied ✓" : "Copy instructions"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
