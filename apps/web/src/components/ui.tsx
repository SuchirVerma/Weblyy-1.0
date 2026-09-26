"use client";
import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="9" fill="#111827" />
      <circle cx="16" cy="16" r="10" fill="none" stroke="#60a5fa" strokeWidth="1.6" opacity=".45" />
      <circle cx="16" cy="16" r="5" fill="none" stroke="#60a5fa" strokeWidth="1.8" />
      <path d="M16 16 L25 9" stroke="#60a5fa" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="22" cy="20.5" r="2.1" fill="#4ade80" />
    </svg>
  );
}

export function StatusPill() {
  const [ai, setAi] = useState<"ai" | "rules" | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((d) => setAi(d.ai))
      .catch(() => setAi("rules"));
  }, []);
  return (
    <span className="pill" title={ai === "rules" ? "No AI API key set, using the built-in rules engine" : undefined}>
      <span className={`dot ${ai === "rules" ? "warn" : ""}`} />
      {ai === null ? "connecting" : ai === "ai" ? "AI online" : "Rules engine"}
    </span>
  );
}

export function Nav({ right }: { right?: ReactNode }) {
  return (
    <header className="nav">
      <div className="wrap nav-inner">
        <Link href="/" className="brand" aria-label="FlowScout home">
          <Logo />
          FlowScout
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link href="/#how" className="hide-sm">
            How it works
          </Link>
          <Link href="/#theory" className="hide-sm">
            The math
          </Link>
          {right ?? <StatusPill />}
        </nav>
      </div>
    </header>
  );
}

export function ScanBar({ autoFocus, compact }: { autoFocus?: boolean; compact?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [err, setErr] = useState("");
  const go = (target: string) => router.push(`/scan?url=${encodeURIComponent(target)}`);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = url.trim();
    if (!v) return setErr("Type a website address, or try the demo salon.");
    if (!/^(https?:\/\/)?[^\s/]+\.[^\s]{2,}/i.test(v)) return setErr("That doesn't look like a website address.");
    setErr("");
    go(v);
  };
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <form className="scanbar" onSubmit={submit} role="search">
        <label>
          <span className="mono muted" aria-hidden="true" style={{ fontSize: ".85rem" }}>
            https://
          </span>
          <span className="sr-only">Business website address</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourbusiness.com"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            autoFocus={autoFocus}
            aria-invalid={Boolean(err)}
            aria-describedby={err ? "scan-err" : undefined}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          Scan my business
          <Arrow />
        </button>
      </form>
      {err && (
        <p id="scan-err" role="alert" style={{ margin: 0, color: "var(--bad)", fontSize: ".9rem" }}>
          {err}
        </p>
      )}
      {!compact && (
        <div className="chips">
          <span className="muted" style={{ fontSize: ".85rem" }}>
            No site handy?
          </span>
          <button type="button" className="chip" onClick={() => go("demo")}>
            <span aria-hidden="true">💇</span> Try the demo salon
          </button>
        </div>
      )}
    </div>
  );
}

export function Arrow() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Adds .in once the element scrolls into view. Children stagger via --i. */
export function Reveal({ children, className = "", delay = 0, as = "div" }: { children: ReactNode; className?: string; delay?: number; as?: "div" | "section" | "li" }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "0px 0px -12% 0px" });
  const Tag = as as "div";
  return (
    <Tag ref={ref} className={`reveal ${inView ? "in" : ""} ${className}`} style={{ transitionDelay: inView ? `${delay}ms` : "0ms" }}>
      {children}
    </Tag>
  );
}

export function CountUp({ to, duration = 1.4, prefix = "", suffix = "", decimals = 0 }: { to: number; duration?: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduce = useReducedMotion();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => `${prefix}${v.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`);
  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      mv.set(to);
      return;
    }
    const c = animate(mv, to, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [inView, to, duration, reduce, mv]);
  return <motion.span ref={ref}>{text}</motion.span>;
}
