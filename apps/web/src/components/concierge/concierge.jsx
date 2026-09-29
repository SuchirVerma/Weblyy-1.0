"use client";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./concierge.module.css";

// Weblyy's own guide. Business pages (dashboards, generated sites, customer chats) have their own agent, so the guide stays off them.
const HIDDEN = /^\/(dashboard|site|mirror|chat|preview|owner(?!-demo)|team)(\/|$)/;
const STORE = "weblyy-guide";

const PROMPTS = [
  { icon: "spark", title: "What is Weblyy?", q: "What is Weblyy?" },
  { icon: "rupee", title: "What does it cost?", q: "How much does it cost?" },
  { icon: "chat", title: "I only have Instagram", q: "I don't have a website, only Instagram" },
  { icon: "hand", title: "I'm not technical", q: "I'm not technical, can you set it up for me?" },
];

function Mark({ size = 22, live = false }) {
  return (
    <svg className={styles.mark} data-live={live || undefined} width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="12" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth="1.6" />
      <circle cx="16" cy="16" r="6.5" fill="none" stroke="currentColor" strokeOpacity=".7" strokeWidth="1.6" />
      <g className={styles.sweep}>
        <path d="M16 16 L26 9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <circle cx="22.5" cy="20.5" r="2.2" fill="#4ade80" />
    </svg>
  );
}

function Icon({ name }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      {name === "spark" && <path {...p} d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />}
      {name === "rupee" && <path {...p} d="M7 5h10M7 9h10M8 5c5 0 5 8 0 8h-1l7 7" />}
      {name === "chat" && <path {...p} d="M5 5h14v10H10l-5 4z" />}
      {name === "hand" && <path {...p} d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V11m0-3a1.5 1.5 0 0 1 3 0v6c0 3.3-2.7 6-6 6h-1c-2.2 0-3.6-1-4.8-2.6L3.5 13a1.6 1.6 0 0 1 2.6-1.8L8 13" />}
      {name === "send" && <path {...p} d="M5 12h13M13 6l6 6-6 6" />}
      {name === "close" && <path {...p} d="M6 6l12 12M18 6 6 18" />}
      {name === "arrow" && <path {...p} d="M7 17 17 7M9 7h8v8" />}
    </svg>
  );
}

function load() {
  try {
    const v = JSON.parse(sessionStorage.getItem(STORE) || "[]");
    return Array.isArray(v) ? v.slice(-20) : [];
  } catch {
    return [];
  }
}

export function Concierge() {
  const path = usePathname() || "/";
  const [open, setOpen] = useState(false);
  // Only rendered inside the panel, which starts closed, so reading storage here can't cause a hydration mismatch.
  const [msgs, setMsgs] = useState(() => (typeof window === "undefined" ? [] : load()));
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [teaser, setTeaser] = useState(false);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const launcherRef = useRef(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(msgs.slice(-20)));
    } catch {
      /* storage blocked */
    }
  }, [msgs]);

  // A one-time nudge per visit, only on the home page.
  useEffect(() => {
    if (path !== "/") return;
    let seen = false;
    try {
      seen = sessionStorage.getItem(`${STORE}-teased`) === "1";
    } catch {}
    if (seen) return;
    const t = setTimeout(() => {
      setTeaser(true);
      try {
        sessionStorage.setItem(`${STORE}-teased`, "1");
      } catch {}
    }, 6000);
    return () => clearTimeout(t);
  }, [path]);

  useEffect(() => {
    if (!teaser) return;
    const t = setTimeout(() => setTeaser(false), 7000);
    return () => clearTimeout(t);
  }, [teaser]);

  const show = useCallback(() => {
    setTeaser(false);
    setOpen(true);
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && open) hide();
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target?.tagName) || e.target?.isContentEditable;
      if (e.key === "/" && !open && !typing && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, show, hide]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 180);
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, busy]);

  const ask = async (q) => {
    const message = q.trim();
    if (!message || busy) return;
    setText("");
    const next = [...msgs, { role: "user", text: message }];
    setMsgs(next);
    setBusy(true);
    try {
      const res = await fetch("/api/concierge", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message, history: msgs.slice(-8).map(({ role, text }) => ({ role, text })) }),
      });
      const d = await res.json();
      setMsgs([...next, res.ok ? { role: "guide", text: d.reply, actions: d.actions || [] } : { role: "guide", text: d.error || "Something went wrong. Try again.", actions: [] }]);
    } catch {
      setMsgs([...next, { role: "guide", text: "I couldn't reach Weblyy just now. Check your connection and try again.", actions: [] }]);
    } finally {
      setBusy(false);
    }
  };

  if (HIDDEN.test(path)) return null;

  return (
    <>
      <AnimatePresence>
        {teaser && !open && (
          <motion.button
            type="button"
            className={styles.teaser}
            onClick={show}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <b>Curious how AI-ready you are?</b>
            <span>Paste your website here. I&rsquo;ll check it in a minute.</span>
          </motion.button>
        )}
      </AnimatePresence>

      <button
        ref={launcherRef}
        type="button"
        className={styles.launcher}
        data-open={open || undefined}
        onClick={() => (open ? hide() : show())}
        aria-expanded={open}
        aria-controls="weblyy-guide"
        aria-label={open ? "Close the Weblyy guide" : "Ask Weblyy"}
      >
        <Mark live />
        <span className={styles.launchText}>Ask Weblyy</span>
        <kbd aria-hidden="true">/</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <motion.section
            id="weblyy-guide"
            role="dialog"
            aria-label="Weblyy guide"
            className={styles.panel}
            initial={{ opacity: 0, y: 18, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.38, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className={styles.head}>
              <div className={styles.brand}>
                <span className={styles.orb}>
                  <Mark size={26} live />
                </span>
                <div>
                  <b>Weblyy Guide</b>
                  <small>
                    <i aria-hidden="true" /> Replies in seconds
                  </small>
                </div>
              </div>
              <button type="button" className={styles.x} onClick={hide} aria-label="Close">
                <Icon name="close" />
              </button>
            </header>

            <div className={styles.body} ref={listRef} aria-live="polite">
              {msgs.length === 0 ? (
                <div className={styles.welcome}>
                  <p className={styles.hello}>
                    How can I help you <span>grow?</span>
                  </p>
                  <p className={styles.sub}>Ask about Weblyy, or paste your website and I&rsquo;ll analyze it.</p>
                  <div className={styles.prompts}>
                    {PROMPTS.map((p, i) => (
                      <motion.button
                        key={p.q}
                        type="button"
                        onClick={() => ask(p.q)}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.05 }}
                      >
                        <span className={styles.pIcon}>
                          <Icon name={p.icon} />
                        </span>
                        {p.title}
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                <ol className={styles.thread}>
                  {msgs.map((m, i) => (
                    <motion.li key={i} data-role={m.role} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
                      {m.role === "guide" && (
                        <span className={styles.avatar}>
                          <Mark size={16} />
                        </span>
                      )}
                      <div className={styles.msg}>
                        <p>{m.text}</p>
                        {m.actions?.length > 0 && (
                          <div className={styles.actions}>
                            {m.actions.map((a) => (
                              <Link key={a.href + a.label} href={a.href} data-primary={a.primary || undefined} onClick={() => setOpen(false)}>
                                {a.label}
                                <Icon name="arrow" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.li>
                  ))}
                  {busy && (
                    <li data-role="guide">
                      <span className={styles.avatar}>
                        <Mark size={16} live />
                      </span>
                      <div className={styles.typing} aria-label="Weblyy is typing">
                        <i />
                        <i />
                        <i />
                      </div>
                    </li>
                  )}
                </ol>
              )}
            </div>

            <form
              className={styles.composer}
              onSubmit={(e) => {
                e.preventDefault();
                ask(text);
              }}
            >
              <input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Ask anything, or paste your website"
                aria-label="Message the Weblyy guide"
                maxLength={500}
                autoComplete="off"
              />
              <button type="submit" disabled={!text.trim() || busy} aria-label="Send">
                <Icon name="send" />
              </button>
            </form>
            <p className={styles.foot}>Answers come from Weblyy&rsquo;s own info. English or Hinglish.</p>
          </motion.section>
        )}
      </AnimatePresence>
    </>
  );
}
