"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./owner-inbox.module.css";

interface Msg {
  id: string;
  at: number;
  role: "customer" | "agent" | "owner";
  text: string;
  intent?: string;
  escalate?: boolean;
  delivered?: "chat" | "whatsapp" | "whatsapp-failed";
}
interface Conv {
  from: string;
  label: string;
  needsOwner: boolean;
  ownerHandling: boolean;
  lastAt: number;
  messages: Msg[];
}

const QUICK = ["Yes, that slot is confirmed. See you then!", "I'll call you in 5 minutes.", "So sorry about this. Let me make it right personally."];

const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};
const time = (t: number) => new Date(t).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

export function OwnerInbox({ agentId, ownerKey, full }: { agentId: string; ownerKey: string; full?: boolean }) {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [name, setName] = useState("");
  const [waReady, setWaReady] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try {
        const res = await fetch(`/api/agents/${agentId}/inbox?key=${encodeURIComponent(ownerKey)}`, { cache: "no-store" });
        const d = await res.json();
        if (!alive) return;
        if (!res.ok) setError(d?.error || "Couldn't load the inbox.");
        else {
          setError("");
          setConvs(d.conversations);
          setName(d.name);
          setWaReady(d.whatsappReady);
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
  }, [agentId, ownerKey]);

  const active = convs.find((c) => c.from === selected) ?? convs[0] ?? null;
  const count = active?.messages.length ?? 0;
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [count, active?.from]);

  const act = async (payload: Record<string, unknown>) => {
    const res = await fetch(`/api/agents/${agentId}/inbox`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ key: ownerKey, to: active?.from, ...payload }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d?.error || "That didn't work.");
    return d;
  };

  const send = async (e?: FormEvent, text = draft) => {
    e?.preventDefault();
    const t = text.trim();
    if (!t || !active || sending) return;
    setSending(true);
    try {
      const d = await act({ text: t });
      setDraft("");
      setConvs((cs) =>
        cs.map((c) => (c.from === active.from ? { ...c, needsOwner: false, ownerHandling: true, messages: [...c.messages, d.message] } : c)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send.");
    } finally {
      setSending(false);
    }
  };

  const toggle = async () => {
    if (!active) return;
    const action = active.ownerHandling ? "handback" : "takeover";
    setConvs((cs) => cs.map((c) => (c.from === active.from ? { ...c, ownerHandling: !c.ownerHandling, needsOwner: action === "takeover" && c.needsOwner } : c)));
    try {
      await act({ action });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't update.");
    }
  };

  const waiting = convs.filter((c) => c.needsOwner).length;

  return (
    <div className={styles.inbox} data-full={full || undefined} data-thread={mobileThread || undefined}>
      <div className={styles.top}>
        <div>
          <h2>
            Owner inbox{name && full ? <span className="muted"> · {name}</span> : null}
          </h2>
          <p className="muted">
            {waiting ? (
              <b style={{ color: "var(--warn)" }}>
                {waiting} chat{waiting > 1 ? "s" : ""} need{waiting > 1 ? "" : "s"} you
              </b>
            ) : (
              "Nothing waiting on you"
            )}
            {" · "}
            {waReady ? "replies also go out on WhatsApp" : "replies appear in the customer's chat"}
          </p>
        </div>
      </div>

      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}

      {convs.length === 0 ? (
        <div className={styles.empty}>
          <p>No conversations yet.</p>
          <p className="muted">When customers message the agent, their chats show up here. Anything the agent can&apos;t handle is flagged for you.</p>
        </div>
      ) : (
        <div className={styles.panes}>
          <ul className={styles.list} aria-label="Conversations">
            {convs.map((c) => {
              const last = c.messages[c.messages.length - 1];
              return (
                <li key={c.from}>
                  <button
                    className={styles.conv}
                    data-active={active?.from === c.from || undefined}
                    onClick={() => {
                      setSelected(c.from);
                      setMobileThread(true);
                    }}
                  >
                    <span className={styles.avatar} aria-hidden="true">
                      {c.label.slice(0, 1)}
                    </span>
                    <span className={styles.convBody}>
                      <span className={styles.convTop}>
                        <b>{c.label}</b>
                        <small>{ago(c.lastAt)}</small>
                      </span>
                      <span className={styles.preview}>
                        {last ? `${last.role === "owner" ? "You: " : last.role === "agent" ? "Agent: " : ""}${last.text}` : ""}
                      </span>
                      <span className={styles.badges}>
                        {c.needsOwner && <span className={styles.needs}>Needs you</span>}
                        {c.ownerHandling && <span className={styles.handling}>You&apos;re handling</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {active && (
            <section className={styles.thread} aria-label={`Chat with ${active.label}`}>
              <div className={styles.threadHead}>
                <button className={styles.back} onClick={() => setMobileThread(false)} aria-label="Back to conversations">
                  ←
                </button>
                <div>
                  <b>{active.label}</b>
                  <small className="muted">
                    {active.ownerHandling ? "You're handling this chat. The agent is paused for this customer." : "The agent is answering this customer."}
                  </small>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={toggle}>
                  {active.ownerHandling ? "Hand back to agent" : "Take over"}
                </button>
              </div>

              <div className={styles.msgs} ref={threadRef}>
                <AnimatePresence initial={false}>
                  {active.messages.map((m) => (
                    <motion.div
                      key={m.id}
                      className={styles.msg}
                      data-role={m.role}
                      data-esc={m.escalate || undefined}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <span className={styles.who}>{m.role === "customer" ? active.label : m.role === "agent" ? "Agent" : "You"}</span>
                      <span>{m.text}</span>
                      <small>
                        {time(m.at)}
                        {m.escalate ? " · flagged for you" : ""}
                        {m.delivered === "whatsapp" ? " · sent on WhatsApp" : m.delivered === "whatsapp-failed" ? " · WhatsApp send failed" : ""}
                      </small>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              <div className={styles.quick} role="group" aria-label="Quick replies">
                {QUICK.map((q) => (
                  <button key={q} onClick={() => send(undefined, q)} disabled={sending}>
                    {q}
                  </button>
                ))}
              </div>
              <form className={styles.reply} onSubmit={send}>
                <label className="sr-only" htmlFor={`reply-${agentId}`}>
                  Reply as the owner
                </label>
                <input
                  id={`reply-${agentId}`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder={`Reply to ${active.label} as the owner`}
                  maxLength={1000}
                  autoComplete="off"
                />
                <button className="btn btn-primary btn-sm" type="submit" disabled={!draft.trim() || sending}>
                  {sending ? "Sending…" : "Send"}
                </button>
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
