"use client";
import { useEffect, useRef, useState } from "react";
import styles from "./site.module.css";
export function ChatButton({ children, className, preview }) {
  const [note, setNote] = useState(false);
  return (
    <>
      <button type="button" className={className} data-weblyy-chat="" onClick={() => (preview ? setNote(true) : window.WeblyyWidget?.open())}>
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
export function LeadForm({ agentId, services, cta, goal }) {
  // The form asks only what this kind of business needs: a class for a school, party size for a restaurant, a slot for a salon.
  const field = (n) => goal?.fields?.find((f) => f.name === n);
  const svc = field("service");
  const when = field("when");
  const people = field("people");
  const note = field("note");
  const [state, setState] = useState("idle");
  const [msg, setMsg] = useState("");
  const submit = async (e) => {
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
          message: [f.get("people") && `${f.get("people")} people`, note && f.get("note") && `${note.label}: ${f.get("note")}`, f.get("message")].filter(Boolean).join(". "),
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
          <span>{field("name")?.label ?? "Your name"}</span>
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
      {goal?.id === "admission" || !services.length ? (
        <label>
          <span>{svc?.label ?? "What are you interested in?"}</span>
          <input name="interest" maxLength={80} placeholder={svc?.placeholder ?? ""} />
        </label>
      ) : (
        <label>
          <span>{svc?.label ?? "What are you interested in?"}</span>
          <select name="interest" defaultValue="">
            <option value="">{svc?.placeholder ?? "Choose one"}</option>
            {services.slice(0, 30).map((s) => (
              <option key={s}>{s}</option>
            ))}
            <option>Something else</option>
          </select>
        </label>
      )}
      {people && (
        <label>
          <span>{people.label}</span>
          <input name="people" type="number" min={1} max={50} inputMode="numeric" placeholder={people.placeholder} />
        </label>
      )}
      {note && (
        <label>
          <span>{note.label}</span>
          <input name="note" maxLength={80} placeholder={note.placeholder} />
        </label>
      )}
      <label>
        <span>{when ? when.label : "Message"}</span>
        <textarea name="message" rows={when ? 2 : 3} maxLength={500} placeholder={when?.placeholder ?? "Your question or requirement"} />
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
export function SafeImg({ src, alt, className, priority, fallback = null }) {
  const [failed, setFailed] = useState(false);
  const ref = useRef(null);
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
/**
 * Motion for the whole site: sections rise in as they scroll into view, and the header turns solid
 * once the hero has passed. Skipped for reduced motion and for automated browsers (screenshots stay complete).
 */
export function SiteMotion() {
  useEffect(() => {
    const root = document.documentElement;
    const header = document.querySelector("[data-site-header]");
    const bar = document.querySelector("[data-site-progress]");
    // Header turns solid past the hero; the thin bar shows how far down the page you are.
    const onScroll = () => {
      header?.toggleAttribute("data-solid", window.scrollY > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar?.style.setProperty("--progress", max > 0 ? String(Math.min(1, window.scrollY / max)) : "0");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    const still = matchMedia("(prefers-reduced-motion: reduce)").matches || navigator.webdriver;
    // Screenshots and reduced motion get the finished page at once, with no opening curtain.
    if (still) {
      document.querySelector("[data-site-curtain]")?.remove();
      return () => {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
      };
    }
    root.setAttribute("data-site-motion", "");

    // Numbers count up the first time they come into view (the real value is already in the HTML).
    const countUp = (el) => {
      const to = Number(el.dataset.count);
      if (!Number.isFinite(to)) return;
      const decimals = (el.dataset.count.split(".")[1] ?? "").length;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / 1400);
        const v = to * (1 - Math.pow(1 - k, 3));
        el.textContent = v.toFixed(decimals);
        if (k < 1) requestAnimationFrame(step);
      };
      el.textContent = (0).toFixed(decimals);
      requestAnimationFrame(step);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          e.target.setAttribute("data-in", "");
          e.target.querySelectorAll("[data-count]").forEach(countUp);
          if (e.target.hasAttribute("data-count")) countUp(e.target);
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    document.querySelectorAll("[data-reveal], [data-count]").forEach((el) => io.observe(el));

    // Magnetic buttons lean gently toward the pointer.
    const magnets = [...document.querySelectorAll("[data-magnetic]")];
    const onMove = (e) => {
      for (const m of magnets) {
        const r = m.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        const near = Math.hypot(dx, dy) < Math.max(r.width, 120);
        m.style.transform = near ? `translate(${dx * 0.18}px, ${dy * 0.28}px)` : "";
      }
    };
    if (matchMedia("(pointer: fine)").matches) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onMove);
      root.removeAttribute("data-site-motion");
    };
  }, []);
  return null;
}
/** A small button that copies a phone number, email or address, with a toast to confirm. */
export function CopyButton({ text, label }) {
  const [toast, setToast] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setToast(true);
    setTimeout(() => setToast(false), 1800);
  };
  return (
    <>
      <button type="button" className={styles.copy} onClick={copy} aria-label={`Copy ${label}`}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <rect x="9" y="9" width="12" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
          <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        Copy
      </button>
      {toast && (
        <span className={styles.toast} role="status">
          ✓ {label} copied
        </span>
      )}
    </>
  );
}
/** Menu-style price list with a live search box. */
export function PriceList({ items, word }) {
  const [q, setQ] = useState("");
  const shown = q ? items.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())) : items;
  return (
    <div className={styles.priceBlock}>
      {items.length > 8 && (
        <label className={styles.search}>
          <span className={styles.srOnly}>Search {word}</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${items.length} ${word.toLowerCase()}…`} />
        </label>
      )}
      <ol className={styles.menuList}>
        {shown.map((p, i) => (
          <li key={p.name}>
            <span className={styles.menuNo}>{String(i + 1).padStart(2, "0")}</span>
            <span className={styles.menuName}>{p.name}</span>
            <i aria-hidden="true" />
            <b>{p.price}</b>
          </li>
        ))}
      </ol>
      {shown.length === 0 && <p className={styles.small}>Nothing matches &ldquo;{q}&rdquo;. Ask us, we probably do it.</p>}
    </div>
  );
}
/** Photo wall; tap a photo to see it large. Arrow keys and Escape work. */
export function Gallery({ photos, name }) {
  const [open, setOpen] = useState(-1);
  useEffect(() => {
    if (open < 0) return;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(-1);
      if (e.key === "ArrowRight") setOpen((i) => (i + 1) % photos.length);
      if (e.key === "ArrowLeft") setOpen((i) => (i - 1 + photos.length) % photos.length);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, photos.length]);
  return (
    <>
      <ul className={styles.wall}>
        {photos.map((g, i) => (
          <li key={g.src} data-reveal style={{ ["--d"]: `${(i % 4) * 70}ms` }}>
            <button type="button" onClick={() => setOpen(i)} aria-label={`Open photo ${i + 1}`}>
              <SafeImg src={g.src} alt={g.alt || `${name} photo ${i + 1}`} />
            </button>
          </li>
        ))}
      </ul>
      {open >= 0 && (
        <div className={styles.lightbox} role="dialog" aria-modal="true" aria-label="Photo" onClick={() => setOpen(-1)}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photos[open].src} alt={photos[open].alt || name} referrerPolicy="no-referrer" onClick={(e) => e.stopPropagation()} />
          <button type="button" className={styles.lbClose} onClick={() => setOpen(-1)} aria-label="Close">
            ✕
          </button>
          <span className={styles.lbCount}>
            {open + 1} / {photos.length}
          </span>
        </div>
      )}
    </>
  );
}
