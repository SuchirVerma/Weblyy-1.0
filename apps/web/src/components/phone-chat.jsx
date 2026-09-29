"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import styles from "./phone-chat.module.css";
const time = () => new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
function linkify(text) {
  return text.split(/(https?:\/\/\S+)/g).map((part, i) =>
    /^https?:\/\//.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noreferrer">
        {part.includes("maps.google") ? "Open in Maps" : part}
      </a>
    ) : (
      part
    ),
  );
}
export function PhoneChat({ agentId, name, suggestions, from, onReply, full, source }) {
  const [msgs, setMsgs] = useState([{ id: 0, who: "system", text: `You're chatting with ${name}'s assistant. It answers from the business's own website.` }]);
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const idRef = useRef(1);
  const bodyRef = useRef(null);
  const fromRef = useRef(null);
  const lastOwnerAt = useRef(0);
  const seenOwner = useRef(new Set());
  const noted = useRef(false);
  const [active, setActive] = useState(false);
  const fromId = () => {
    fromRef.current ??= typeof from === "function" ? from() : (from ?? null);
    return fromRef.current;
  };
  // Once the customer has said something, watch for replies from the owner.
  useEffect(() => {
    if (!active) return;
    let alive = true;
    let timer;
    const poll = async () => {
      const id = fromRef.current;
      if (id) {
        try {
          const res = await fetch(`/api/agent/updates?agentId=${agentId}&from=${encodeURIComponent(id)}&after=${lastOwnerAt.current}`, { cache: "no-store" });
          const d = await res.json();
          if (!alive) return;
          const fresh = d.messages.filter((m) => !seenOwner.current.has(m.id));
          if (fresh.length) {
            for (const m of fresh) seenOwner.current.add(m.id);
            lastOwnerAt.current = Math.max(lastOwnerAt.current, ...fresh.map((m) => m.at));
            setMsgs((list) => [
              ...list,
              ...(noted.current ? [] : [{ id: idRef.current++, who: "system", text: `The owner of ${name} has joined the chat.` }]),
              ...fresh.map((m) => ({
                id: idRef.current++,
                who: "owner",
                text: m.text,
                meta: `Owner · ${new Date(m.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`,
              })),
            ]);
            noted.current = true;
          }
        } catch {
          /* keep polling */
        }
      }
      if (alive) timer = setTimeout(poll, 2500);
    };
    poll();
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [active, agentId, name]);
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [msgs.length, typing]);
  const send = async (raw) => {
    const message = raw.trim();
    if (!message || typing) return;
    setText("");
    setMsgs((m) => [...m, { id: idRef.current++, who: "me", text: message, meta: time() }]);
    setTyping(true);
    const started = performance.now();
    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, message, from: fromId() ?? undefined, source }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "The agent didn't answer.");
      const r = data;
      if (!active) {
        lastOwnerAt.current = Date.now() - 1000;
        setActive(true);
      }
      if (r.ownerHandling) {
        if (!noted.current) {
          noted.current = true;
          setMsgs((m) => [...m, { id: idRef.current++, who: "system", text: `The owner of ${name} is replying personally. Their answer will appear here.` }]);
        }
        onReply?.(r, Math.round(performance.now() - started), message);
        return;
      }
      const ms = Math.round(performance.now() - started);
      const wait = 650 - ms;
      if (wait > 0) await new Promise((res) => setTimeout(res, wait));
      setMsgs((m) => [...m, { id: idRef.current++, who: "agent", text: r.reply, meta: `${time()}${r.escalate ? " · owner alerted" : ""}` }]);
      onReply?.(r, ms, message);
    } catch (e) {
      setMsgs((m) => [...m, { id: idRef.current++, who: "system", text: e instanceof Error ? e.message : "Message failed. Try again." }]);
    } finally {
      setTyping(false);
    }
  };
  const submit = (e) => {
    e.preventDefault();
    send(text);
  };
  return (
    <div className={styles.phone} data-full={full || undefined}>
      <div className={styles.head}>
        <span className={styles.avatar} aria-hidden="true">
          {name.slice(0, 1)}
        </span>
        <div>
          <b>{name}</b>
          <span>{typing ? "typing…" : "online · replies instantly"}</span>
        </div>
      </div>
      <div className={styles.body} ref={bodyRef} aria-live="polite">
        <AnimatePresence initial={false}>
          {msgs.map((m) => (
            <motion.div
              key={m.id}
              className={styles.msg}
              data-who={m.who}
              initial={{ opacity: 0, y: 10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              <span>{linkify(m.text)}</span>
              {m.meta && <small>{m.meta}</small>}
            </motion.div>
          ))}
          {typing && (
            <motion.div key="typing" className={styles.msg} data-who="agent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <span className={styles.dots} aria-label="Agent is typing">
                <i />
                <i />
                <i />
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className={styles.suggest} role="group" aria-label="Try asking">
        {suggestions.map((s) => (
          <button key={s} type="button" onClick={() => send(s)} disabled={typing}>
            {s}
          </button>
        ))}
      </div>
      <form className={styles.input} onSubmit={submit}>
        <label className="sr-only" htmlFor={`msg-${agentId}`}>
          Message
        </label>
        <input id={`msg-${agentId}`} value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message" maxLength={500} autoComplete="off" />
        <button type="submit" disabled={!text.trim() || typing} aria-label="Send">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 20.5 21 12 3 3.5l2.6 7.2L14 12l-8.4 1.3z" fill="currentColor" />
          </svg>
        </button>
      </form>
    </div>
  );
}
