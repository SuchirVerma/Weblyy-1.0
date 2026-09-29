"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./site.module.css";

declare global {
  interface Window {
    WeblyyWidget?: { open: () => void };
  }
}

export function ChatButton({ children, className, preview }: { children: React.ReactNode; className?: string; preview?: boolean }) {
  const [note, setNote] = useState(false);
  return (
    <>
      <button
        type="button"
        className={className}
        data-weblyy-chat=""
        onClick={() => (preview ? setNote(true) : window.WeblyyWidget?.open())}
      >
        {children}
      </button>
      {preview && note && (
        <span className={styles.chatNote} role="status">
          The AI assistant answers here once the site goes live.
        </span>
      )}
    </>
  );
}

export function LeadForm({ agentId, services, cta }: { agentId: string | null; services: string[]; cta: string }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!agentId) {
      setMsg("This is a preview. The form starts sending enquiries once the site goes live.");
      setState("error");
      return;
    }
    const f = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          agentId,
          name: f.get("name"),
          phone: f.get("phone"),
          email: f.get("email"),
          interest: f.get("interest"),
          message: f.get("message"),
          website: f.get("website"),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Couldn't send. Please try again.");
      setMsg(`Thanks${d.name ? `, ${String(d.name).split(" ")[0]}` : ""}! We'll get back to you shortly.`);
      setState("done");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Couldn't send. Please try again.");
      setState("error");
    }
  };
  if (state === "done")
    return (
      <div className={styles.formDone} role="status">
        <b>✓ Request received</b>
        <span>{msg}</span>
      </div>
    );
  return (
    <form className={styles.form} onSubmit={submit}>
      <div className={styles.row2}>
        <label>
          <span>Your name</span>
          <input name="name" required maxLength={60} autoComplete="name" />
        </label>
        <label>
          <span>Phone number</span>
          <input name="phone" type="tel" inputMode="tel" maxLength={20} autoComplete="tel" placeholder="98765 43210" />
        </label>
      </div>
      <label>
        <span>Email (optional)</span>
        <input name="email" type="email" maxLength={100} autoComplete="email" />
      </label>
      <label>
        <span>What are you interested in?</span>
        <select name="interest" defaultValue="">
          <option value="">Choose a service</option>
          {services.slice(0, 30).map((s) => (
            <option key={s}>{s}</option>
          ))}
          <option>Something else</option>
        </select>
      </label>
      <label>
        <span>Message</span>
        <textarea name="message" rows={3} maxLength={500} placeholder="Preferred day and time, questions…" />
      </label>
      <input name="website" tabIndex={-1} autoComplete="off" className={styles.hp} aria-hidden="true" aria-label="Leave this empty" />
      {state === "error" && (
        <p className={styles.formErr} role="alert">
          {msg}
        </p>
      )}
      <button className={styles.primary} type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : cta}
      </button>
    </form>
  );
}

/** A photo from the original site. If the host refuses to serve it, the image disappears (the CSS hides its empty frame) instead of showing broken. */
export function SafeImg({ src, alt, className, priority, fallback = null }: { src: string; alt: string; className?: string; priority?: boolean; fallback?: React.ReactNode }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLImageElement>(null);
  // An image that failed before the page became interactive never fires onError for React; catch it here.
  useEffect(() => {
    const img = ref.current;
    if (img?.complete && img.naturalWidth === 0) setFailed(true);
  }, []);
  if (failed) return <>{fallback}</>;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={ref}
      src={src}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      loading={priority ? "eager" : "lazy"}
      fetchPriority={priority ? "high" : undefined}
      onError={() => setFailed(true)}
    />
  );
}
