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
        <Link href="/" className="brand" aria-label="Weblyy home">
          <Logo />
          Weblyy
        </Link>
        <nav className="nav-links" aria-label="Main">
          <Link href="/how" className="hide-sm">
            How it works
          </Link>
          <Link href="/owner-demo" className="hide-sm">
            See a demo
          </Link>
          <Link href="/setup" className="hide-sm">
            We set it up
          </Link>
          {right ?? (
            <Link href="/#product" className="btn btn-primary btn-sm">
              Analyze my website
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}

const URL_LIKE = /^(https?:\/\/)?[^\s/]+\.[a-z]{2,}(\/\S*)?$/i;
const IG_LIKE = /^@[A-Za-z0-9._]{1,30}$|instagram\.com\/[A-Za-z0-9._]+/i;

export function ScanBar({ autoFocus, compact, initial = "" }: { autoFocus?: boolean; compact?: boolean; initial?: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initial);
  const [err, setErr] = useState("");
  const go = (target: string) => router.push(`/scan?url=${encodeURIComponent(target)}`);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = value.trim();
    if (!v) return setErr("Type a business name, website or @instagram handle.");
    if (v.length < 2) return setErr("That's a bit short. Try the full business name.");
    setErr("");
    if (IG_LIKE.test(v) || URL_LIKE.test(v)) return go(v);
    router.push(`/find?q=${encodeURIComponent(v)}`);
  };
  const looksLikeName = value.trim().length > 1 && !IG_LIKE.test(value.trim()) && !URL_LIKE.test(value.trim());
  return (
    <div style={{ display: "grid", gap: 14 }}>
      <form className="scanbar" onSubmit={submit} role="search">
        <label>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ color: "var(--faint)", flex: "none" }}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <span className="sr-only">Business name, website or Instagram handle</span>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Your website URL, business name or @instagram"
            autoComplete="off"
            spellCheck={false}
            autoFocus={autoFocus}
            aria-invalid={Boolean(err)}
            aria-describedby={err ? "scan-err" : undefined}
          />
        </label>
        <button className="btn btn-primary" type="submit">
          {looksLikeName ? "Find my business" : "Analyze My Website"}
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
            Try:
          </span>
          <button type="button" className="chip" onClick={() => go("demo")}>
            Demo salon
          </button>
          <button type="button" className="chip" onClick={() => router.push(`/find?q=${encodeURIComponent("North Delhi Dental Clinic Model Town")}`)}>
            &ldquo;North Delhi Dental Clinic&rdquo;
          </button>
          <button type="button" className="chip" onClick={() => go("@naturalssalon")}>
            @naturalssalon
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
