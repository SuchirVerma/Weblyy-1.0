"use client";
import { useState, type FormEvent } from "react";
import styles from "./site.module.css";

declare global {
  interface Window {
    FlowScoutWidget?: { open: () => void };
  }
}

export function ChatButton({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.FlowScoutWidget?.open()}>
      {children}
    </button>
  );
}

export function LeadForm({ agentId, services }: { agentId: string; services: string[] }) {
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
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
      <input name="website" tabIndex={-1} autoComplete="off" className={styles.hp} aria-hidden="true" />
      {state === "error" && (
        <p className={styles.formErr} role="alert">
          {msg}
        </p>
      )}
      <button className={styles.primary} type="submit" disabled={state === "sending"}>
        {state === "sending" ? "Sending…" : "Request a call back"}
      </button>
    </form>
  );
}
