"use client";
import { useEffect, useState } from "react";
import { QrCard } from "../qr-card";
import styles from "./go-live.module.css";
function useOrigin() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setOrigin(s.publicOrigin || window.location.origin))
      .catch(() => setOrigin(window.location.origin));
  }, []);
  return origin;
}
const CHOICES = [
  { key: "us", icon: "☎", title: "We set it up for you", line: "Our team calls you and does everything. Free.", tag: "Recommended" },
  { key: "share", icon: "🔗", title: "Share your links", line: "Links and a QR code for Instagram, Google and your shop.", tag: "1 minute" },
  { key: "helper", icon: "✉", title: "Send to your web person", line: "We write the message. You press send.", tag: "" },
];
const GOALS = [
  "Put the AI assistant on my website",
  "Reply to customers on WhatsApp",
  "Get more customers from Google",
  "Build me a new website",
  "Set up everything for me",
  "Something else (I'll explain on the call)",
];
const PLATFORMS = ["WordPress", "Wix", "Shopify", "GoDaddy", "Google Sites", "Someone else made it", "I don't have a website", "Not sure"];
/** Getting Weblyy onto the business, in plain words. No code for the owner, ever. */
export function GoLive({ data, ownerKey }) {
  const origin = useOrigin();
  const k = data.business;
  const siteUrl = origin ? `${origin}${data.links.sitePath}` : "";
  const chatUrl = origin ? `${origin}${data.links.chatPath}` : "";
  const snippet = `<script src="${origin}/widget.js" data-agent="${data.id}" async></script>`;
  const [copied, setCopied] = useState("");
  const [helper, setHelper] = useState("");
  const [pick, setPick] = useState(data.setupRequest ? "share" : "us");
  const copy = async (label, text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(""), 1800);
    } catch {
      /* clipboard blocked */
    }
  };
  const helperMessage = `Hi! Please add our new AI chat assistant to the ${k.name} website. It takes 2 minutes:

1. Copy this one line:
${snippet}

2. Paste it just before </body> on every page (WordPress: WPCode plugin → Footer. Wix: Settings → Custom code. Shopify: theme.liquid).

That's it. A chat button will appear in the corner. Guide: ${origin}/integrate
Thank you!`;
  const helperDigits = helper.replace(/\D/g, "");
  const helperIsPhone = helperDigits.length >= 10 && !helper.includes("@");
  const sendHelper = () => {
    if (helperIsPhone) {
      const n = helperDigits.length === 10 ? `91${helperDigits}` : helperDigits;
      window.open(`https://wa.me/${n}?text=${encodeURIComponent(helperMessage)}`, "_blank");
    } else {
      window.location.href = `mailto:${encodeURIComponent(helper)}?subject=${encodeURIComponent(`Add the AI chat to the ${k.name} website`)}&body=${encodeURIComponent(helperMessage)}`;
    }
  };
  return (
    <div className={styles.wrap}>
      <header className={styles.head}>
        <p className="kicker">Go live</p>
        <h1>
          Put your AI assistant to work. <span className="em">No coding needed.</span>
        </h1>
        <p className="lede">Choose one way to start. You can come back and do the others later.</p>
      </header>

      <div className={styles.choices} role="tablist" aria-label="Ways to go live">
        {CHOICES.map((c) => (
          <button key={c.key} role="tab" aria-selected={pick === c.key} className={styles.choice} onClick={() => setPick(c.key)}>
            <span className={styles.choiceIcon} aria-hidden="true">
              {c.icon}
            </span>
            <b>{c.title}</b>
            <small>{c.line}</small>
            {c.key === "us" && data.setupRequest ? <em>✓ Requested</em> : c.tag ? <em>{c.tag}</em> : null}
          </button>
        ))}
      </div>

      {/* ---------------------------------------------------- 1. done for you */}
      {pick === "us" && <DoneForYou data={data} ownerKey={ownerKey} />}

      {/* ------------------------------------------------- 2. share the link */}
      {pick === "share" && (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2>Share your links yourself</h2>
              <p className="muted">Takes 1 minute. Works even if you have no website.</p>
            </div>
          </div>
          <div className={styles.links}>
            <div className={styles.linkRow}>
              <div>
                <b>Your new AI-ready website</b>
                <small>{siteUrl || "…"}</small>
              </div>
              <div className={styles.actions}>
                <button className="btn btn-ghost btn-sm" onClick={() => copy("site", siteUrl)} disabled={!siteUrl}>
                  {copied === "site" ? "Copied ✓" : "Copy"}
                </button>
                <a className="btn btn-ghost btn-sm" href={data.links.sitePath} target="_blank" rel="noreferrer">
                  Open
                </a>
              </div>
            </div>
            <div className={styles.linkRow}>
              <div>
                <b>Chat with your assistant (for Instagram bio, Google, WhatsApp status)</b>
                <small>{chatUrl || "…"}</small>
              </div>
              <div className={styles.actions}>
                <button className="btn btn-ghost btn-sm" onClick={() => copy("chat", chatUrl)} disabled={!chatUrl}>
                  {copied === "chat" ? "Copied ✓" : "Copy"}
                </button>
                <a
                  className="btn btn-ghost btn-sm"
                  href={`https://wa.me/?text=${encodeURIComponent(`Ask ${k.name} anything, we reply instantly: ${chatUrl}`)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Share on WhatsApp
                </a>
              </div>
            </div>
          </div>
          <details className={styles.more}>
            <summary>Where should I put these links?</summary>
            <ul className={styles.tips}>
              <li>
                <b>Instagram:</b> Edit profile → Links → paste the chat link.
              </li>
              <li>
                <b>Google Maps listing:</b> Edit profile → Website → paste your new website link.
              </li>
              <li>
                <b>Shop counter:</b> print the QR poster below and stick it near the billing desk.
              </li>
            </ul>
          </details>
          <QrCard chatPath={data.links.chatPath} name={k.name} />
        </section>
      )}

      {/* ------------------------------------------------ 3. send to helper */}
      {pick === "helper" && (
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <div>
              <h2>Send it to the person who made your website</h2>
              <p className="muted">We write the message for them. You just press send.</p>
            </div>
          </div>
          <label className={styles.field}>
            <span>Their WhatsApp number or email</span>
            <input value={helper} onChange={(e) => setHelper(e.target.value)} placeholder="98765 43210 or name@email.com" inputMode="email" />
          </label>
          <div className={styles.actions}>
            <button className="btn btn-primary" onClick={sendHelper} disabled={!helperIsPhone && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(helper)}>
              {helperIsPhone ? "Send on WhatsApp" : "Send by email"}
            </button>
            <button className="btn btn-ghost btn-sm" onClick={() => copy("msg", helperMessage)}>
              {copied === "msg" ? "Copied ✓" : "Copy the message instead"}
            </button>
          </div>
          <details className={styles.more}>
            <summary>See what we&apos;ll send them</summary>
            <pre>{helperMessage}</pre>
          </details>
        </section>
      )}
    </div>
  );
}
function DoneForYou({ data, ownerKey }) {
  const [sent, setSent] = useState(data.setupRequest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/setup-request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          id: data.id,
          key: ownerKey,
          name: f.get("name"),
          phone: f.get("phone"),
          goal: f.get("goal"),
          platform: f.get("platform"),
          bestTime: f.get("bestTime"),
          note: f.get("note"),
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Couldn't send. Please try again.");
      setSent(d.request);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className={`${styles.card} ${styles.featured}`}>
      <div className={styles.cardHead}>
        <div>
          <h2>Let us set it up for you</h2>
          <p className="muted">Our team calls you, connects everything to your website and WhatsApp, and checks it works. You don&apos;t touch any code.</p>
        </div>
      </div>

      {sent ? (
        <div className={styles.done} role="status">
          <b>✓ Request received</b>
          <span>
            We&apos;ll call {sent.name} on {sent.phone} ({sent.bestTime.toLowerCase()}). Keep your website login handy if you have one; we&apos;ll guide you
            through the rest.
          </span>
        </div>
      ) : (
        <form className={styles.form} onSubmit={submit}>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>Your name</span>
              <input name="name" required maxLength={60} autoComplete="name" />
            </label>
            <label className={styles.field}>
              <span>Phone / WhatsApp</span>
              <input name="phone" required type="tel" inputMode="tel" maxLength={20} autoComplete="tel" placeholder="98765 43210" />
            </label>
          </div>
          <label className={styles.field}>
            <span>What do you need help with?</span>
            <select name="goal" required defaultValue="">
              <option value="" disabled>
                Choose one
              </option>
              {GOALS.map((g) => (
                <option key={g}>{g}</option>
              ))}
            </select>
          </label>
          <div className={styles.row}>
            <label className={styles.field}>
              <span>Your website is made with</span>
              <select name="platform" defaultValue="Not sure">
                {PLATFORMS.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>Best time to call</span>
              <select name="bestTime" defaultValue="Any time">
                {["Any time", "Morning (10–12)", "Afternoon (12–4)", "Evening (4–8)"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </label>
          </div>
          <label className={styles.field}>
            <span>Anything we should know? (optional)</span>
            <input name="note" maxLength={400} placeholder="e.g. My nephew made the website, I don't have the login" />
          </label>
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}
          <button className="btn btn-primary" type="submit" disabled={busy}>
            {busy ? "Sending…" : "Request a free setup call"}
          </button>
        </form>
      )}
    </section>
  );
}
