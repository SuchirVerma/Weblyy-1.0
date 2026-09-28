"use client";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import type { Audit, AuditCategory } from "@/lib/audit";
import { CodeBlock } from "../code-block";
import { OwnerInbox } from "../owner-inbox";
import { PhoneChat } from "../phone-chat";
import { QrCard } from "../qr-card";
import { BeforeAfterChart } from "../scan/before-after";
import type { TabKey } from "./command-center";
import { ago, type CCData, type CCLead } from "./types";
import styles from "./cc.module.css";

type Act = (p: Record<string, unknown>) => Promise<unknown>;

/* ------------------------------------------------------------------ shared */

function Head({ kicker, title, children }: { kicker: string; title: React.ReactNode; children?: React.ReactNode }) {
  return (
    <header className={styles.head}>
      <div>
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
      </div>
      {children && <div className={styles.headActions}>{children}</div>}
    </header>
  );
}


function Status({ level, children }: { level: "good" | "warn" | "bad" | "off"; children: React.ReactNode }) {
  return (
    <span className={styles.status} data-level={level}>
      {children}
    </span>
  );
}

function CheckList({ cat }: { cat: AuditCategory }) {
  return (
    <ul className={styles.checks}>
      {cat.checks.map((c) => (
        <li key={c.label} data-ok={c.ok === true ? "yes" : c.ok === "partial" ? "partial" : "no"}>
          <span aria-hidden="true">{c.ok === true ? "✓" : c.ok === "partial" ? "!" : "✕"}</span>
          <div>
            <b>{c.label}</b>
            <small>{c.detail}</small>
          </div>
        </li>
      ))}
    </ul>
  );
}

function useOrigin() {
  const [origin, setOrigin] = useState("");
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: { publicOrigin?: string | null }) => setOrigin(s.publicOrigin || window.location.origin))
      .catch(() => setOrigin(window.location.origin));
  }, []);
  return origin;
}

function ScoreRing({ value, size = 132, label }: { value: number; size?: number; label?: string }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const tone = value >= 75 ? "var(--ok)" : value >= 45 ? "var(--warn)" : "var(--bad)";
  return (
    <div className={styles.ring} style={{ width: size, height: size }}>
      <svg viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r={r} className={styles.ringTrack} />
        <motion.circle
          cx="60"
          cy="60"
          r={r}
          className={styles.ringFill}
          style={{ stroke: tone }}
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - value / 100) }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          transform="rotate(-90 60 60)"
        />
      </svg>
      <div>
        <b>{value}</b>
        {label && <small>{label}</small>}
      </div>
    </div>
  );
}

function catOf(a: Audit | undefined, key: string) {
  return a?.categories.find((c) => c.key === key);
}

/* ---------------------------------------------------------------- overview */

export function OverviewTab({ data, go }: { data: CCData; go: (t: TabKey) => void }) {
  const ws = data.workspace;
  const before = ws?.auditBefore;
  const after = ws?.auditAfter;
  const qualified = data.leads.filter((l) => l.status === "qualified" || l.temperature === "hot").length;
  const activeAutos = data.automations.filter((a) => a.on && a.ready && !a.requires).length;
  const chatLeads = data.leads.filter((l) => l.source !== "Website form").length;
  const steps = [
    { done: true, label: "Website checked", hint: `Scored ${before?.score ?? "–"} / 100` },
    { done: true, label: "Your new website is ready", hint: "Live now", tab: "website" as TabKey },
    { done: data.stats.messages > 0, label: "Chat with your assistant like a customer", hint: "Ask a price, then share a name and number", tab: "agent" as TabKey },
    { done: data.leads.length > 0, label: "See them appear in Customers", hint: data.leads.length ? `${data.leads.length} lead${data.leads.length > 1 ? "s" : ""} so far` : "Qualified automatically", tab: "leads" as TabKey },
    { done: data.runs.some((r) => r.automation !== "Business made AI-ready"), label: "See what Autopilot did", hint: "Qualification, follow-up, owner alerts", tab: "automations" as TabKey },
  ];

  return (
    <div className={styles.stack}>
      <Head kicker="Your dashboard" title={<>{data.business.name} is <span className="em">AI-ready.</span></>}>
        <a className="btn btn-primary btn-sm" href={data.links.sitePath} target="_blank" rel="noreferrer">
          Open AI-ready website ↗
        </a>
        <button className="btn btn-ghost btn-sm" onClick={() => go("agent")}>
          Chat as a customer
        </button>
      </Head>

      {!data.setupRequest && (
        <section className={styles.nextStep}>
          <div>
            <b>Next step: put your assistant to work</b>
            <span>We can set it up on your website and WhatsApp for you, free. No coding.</span>
          </div>
          <button className="btn btn-primary" onClick={() => go("golive")}>
            Go live →
          </button>
        </section>
      )}

      <section className={styles.hero}>
        <div className={styles.heroScore}>
          <p className="kicker">AI readiness</p>
          <div className={styles.beforeAfter}>
            <div>
              <ScoreRing value={before?.score ?? 0} size={104} />
              <small>Before</small>
            </div>
            <span className={styles.arrow}>→</span>
            <div>
              <ScoreRing value={after?.score ?? 0} size={140} />
              <small>Now</small>
            </div>
          </div>
        </div>
        <ul className={styles.catBars}>
          {after?.categories.map((c) => {
            const b = catOf(before, c.key);
            return (
              <li key={c.key}>
                <span>{c.label}</span>
                <div className={styles.dualTrack}>
                  <motion.i className={styles.trackBefore} initial={{ scaleX: 0 }} animate={{ scaleX: (b?.score ?? 0) / 100 }} />
                  <motion.i className={styles.trackAfter} initial={{ scaleX: 0 }} animate={{ scaleX: c.score / 100 }} transition={{ delay: 0.3, duration: 0.9 }} />
                </div>
                <b>
                  {b?.score ?? 0} → {c.score}
                </b>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.cards}>
        <button className={styles.stat} onClick={() => go("website")}>
          <small>Website</small>
          <b>Active</b>
          <Status level="good">AI-ready site live</Status>
        </button>
        <button className={styles.stat} onClick={() => go("agent")}>
          <small>Your assistant</small>
          <b>Active</b>
          <Status level="good">{data.stats.messages} messages answered</Status>
        </button>
        <button className={styles.stat} onClick={() => go("search")}>
          <small>Found online</small>
          <b>{catOf(after, "search")?.score ?? 0}/100</b>
          <Status level="good">Optimized</Status>
        </button>
        <button className={styles.stat} onClick={() => go("leads")}>
          <small>Customers</small>
          <b>{data.leads.length}</b>
          <Status level={data.leads.length ? "good" : "off"}>{chatLeads} from chats</Status>
        </button>
        <button className={styles.stat} onClick={() => go("leads")}>
          <small>Serious buyers</small>
          <b>{qualified}</b>
          <Status level={qualified ? "good" : "off"}>Ready to buy</Status>
        </button>
        <button className={styles.stat} onClick={() => go("automations")}>
          <small>Autopilot</small>
          <b>{activeAutos} jobs on</b>
          <Status level="good">{data.runs.length} runs</Status>
        </button>
      </section>

      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Try it yourself</h2>
          <ol className={styles.journey}>
            {steps.map((s, i) => (
              <li key={i} data-done={s.done || undefined}>
                <span>{s.done ? "✓" : i + 1}</span>
                <div>
                  <b>{s.label}</b>
                  <small>{s.hint}</small>
                </div>
                {s.tab && (
                  <button className="btn btn-ghost btn-sm" onClick={() => go(s.tab!)}>
                    Open
                  </button>
                )}
              </li>
            ))}
          </ol>
        </section>
        <section className={styles.panel}>
          <h2>What happened today</h2>
          <RunList runs={data.runs.slice(0, 7)} />
        </section>
      </div>
    </div>
  );
}

function RunList({ runs }: { runs: CCData["runs"] }) {
  if (!runs.length) return <p className="muted">Nothing yet. Activity shows up here the moment a customer messages.</p>;
  return (
    <ul className={styles.runs}>
      {runs.map((r) => (
        <motion.li key={r.id} layout initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
          <div className={styles.runTop}>
            <b>{r.automation}</b>
            <small>{ago(r.at)}</small>
          </div>
          <span className="muted">{r.detail}</span>
          <div className={styles.flow}>
            {r.steps.map((s, i) => (
              <span key={i}>{s}</span>
            ))}
          </div>
        </motion.li>
      ))}
    </ul>
  );
}

/* ----------------------------------------------------------------- website */

export function WebsiteTab({ data }: { data: CCData }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const before = catOf(data.workspace?.auditBefore, "website");
  const after = catOf(data.workspace?.auditAfter, "website");
  return (
    <div className={styles.stack}>
      <Head kicker="My website" title={<>Your new website, <span className="em">ready for customers.</span></>}>
        <a className="btn btn-primary btn-sm" href={data.links.sitePath} target="_blank" rel="noreferrer">
          Open website ↗
        </a>
      </Head>
      <p className="lede">
        Same business and prices as {data.business.url.includes("instagram.com") ? "your Instagram" : "your current site"}, rebuilt for phones with Book, Call and Chat
        on every screen.
      </p>

      <section className={styles.preview}>
        <div className={styles.previewBar}>
          <span className={styles.url}>{data.links.sitePath}</span>
          <div className="chips">
            <button className="chip" aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
              Desktop
            </button>
            <button className="chip" aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
              Mobile
            </button>
          </div>
        </div>
        <div className={styles.frameWrap} data-device={device}>
          <iframe src={data.links.sitePath} title="AI-ready website preview" loading="lazy" />
        </div>
      </section>

      {data.workspace && (
        <section className={styles.panel}>
          <h2>Before and after Weblyy</h2>
          <p className="muted" style={{ margin: "0 0 16px" }}>
            Your business score in each area: your old website on its own, and with Weblyy switched on. Tap a row to see why.
          </p>
          <BeforeAfterChart before={data.workspace.auditBefore} after={data.workspace.auditAfter} />
        </section>
      )}

      <details className={`${styles.panel} ${styles.dev}`} style={{ paddingTop: 20 }}>
        <summary>See the website checklist (old vs new)</summary>
        <div className={styles.two}>
          <section>
            <h2>
              Old website <Status level={before?.level ?? "bad"}>{before?.score ?? 0}/100</Status>
            </h2>
            {before && <CheckList cat={before} />}
            <p className="muted" style={{ marginTop: 12, fontSize: ".85rem" }}>
              Original: <a href={data.business.url} target="_blank" rel="noreferrer">{data.business.url}</a>
            </p>
          </section>
          <section>
            <h2>
              New website <Status level={after?.level ?? "good"}>{after?.score ?? 0}/100</Status>
            </h2>
            {after && <CheckList cat={after} />}
          </section>
        </div>
      </details>
    </div>
  );
}

/* --------------------------------------------------------------- AI agent */

export function AgentTab({ data, ownerKey }: { data: CCData; ownerKey: string }) {
  const origin = useOrigin();
  const [info, setInfo] = useState<"does" | "where" | null>(null);
  const k = data.business;
  const caps = [
    ["Answers customer questions", "Prices, timings, location and services, in seconds."],
    ["Understands the business", `${k.prices.length} prices, ${k.faqs.length} FAQs${k.hours.length ? ", hours" : ""}${k.address ? ", address" : ""} learned from the site.`],
    ["Explains services", "Suggests the right service and quotes the published price."],
    ["Captures visitor details", "Asks for name and number when a customer shows interest."],
    ["Qualifies leads", "Scores every lead hot, warm or cold with reasons."],
    ["Guides to booking", "Collects the service and time, then the owner confirms."],
    ["Triggers automations", "Lead follow-up, owner alerts, booking confirmations."],
    ["Knows its limits", "Complaints, refunds and medical questions go to the owner."],
  ];
  return (
    <div className={styles.stack}>
      <Head kicker="Chats" title={<>Your assistant is <span className="em">answering customers.</span></>} />
      <div className={styles.agentGrid}>
        <div>
          <p className={styles.sideLabel}>Try it as a customer</p>
          <PhoneChat
            agentId={data.id}
            name={k.name}
            from="command-center-test"
            source="Command Center test"
            suggestions={[k.prices[0] ? `${k.prices[0].name} kitne ka hai?` : "Price kya hai?", "Saturday 4pm free hai?", "Main Riya, 9876543210", "I want a refund"]}
          />
        </div>
        <div className={styles.stack}>
          <section className={styles.panel}>
            <h2>QR code</h2>
            <QrCard chatPath={data.links.chatPath} name={k.name} />
          </section>
          <section className={styles.panel}>
            <div className="chips" role="tablist" aria-label="About your assistant" style={{ marginBottom: 16 }}>
              <button role="tab" className="chip" aria-selected={info === "does"} aria-pressed={info === "does"} onClick={() => setInfo(info === "does" ? null : "does")}>
                What does it do?
              </button>
              <button role="tab" className="chip" aria-selected={info === "where"} aria-pressed={info === "where"} onClick={() => setInfo(info === "where" ? null : "where")}>
                Where do customers reach it?
              </button>
            </div>
            {info === null && <p className="muted" style={{ margin: 0 }}>Tap an option above to learn more.</p>}
            {info === "does" && (
              <ul className={styles.caps}>
                {caps.map(([t, d]) => (
                  <li key={t}>
                    <span aria-hidden="true">✓</span>
                    <div>
                      <b>{t}</b>
                      <small>{d}</small>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            {info === "where" && (
              <ul className={styles.caps}>
                <li>
                  <span aria-hidden="true">▭</span>
                  <div>
                    <b>AI-ready website</b>
                    <small>Chat button on every page.</small>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">↗</span>
                  <div>
                    <b>Chat link and QR code</b>
                    <small>{origin ? `${origin}${data.links.chatPath}` : data.links.chatPath}</small>
                  </div>
                </li>
                <li>
                  <span aria-hidden="true">✆</span>
                  <div>
                    <b>WhatsApp</b>
                    <small>{data.integrations.twilio ? "Connected." : "Not connected yet. We connect your WhatsApp number during the free setup (Go live)."}</small>
                  </div>
                </li>
              </ul>
            )}
          </section>
        </div>
      </div>
      <OwnerInbox agentId={data.id} ownerKey={ownerKey} />
    </div>
  );
}

/* -------------------------------------------------------------- AI Search */

export function SearchTab({ data }: { data: CCData }) {
  const before = catOf(data.workspace?.auditBefore, "search");
  const after = catOf(data.workspace?.auditAfter, "search");
  const s = data.workspace?.search;
  if (!s) return <p className="muted">Not available.</p>;
  return (
    <div className={styles.stack}>
      <Head kicker="Get found online" title={<>Help Google and AI assistants <span className="em">understand your business.</span></>} />
      <p className="lede">
        Clear facts help AI answer &ldquo;best {data.business.type} near me&rdquo; with you. No ranking is guaranteed.
      </p>

      <section className={styles.hero}>
        <div className={styles.heroScore}>
          <p className="kicker">AI Search Readiness</p>
          <div className={styles.beforeAfter}>
            <div>
              <ScoreRing value={before?.score ?? 0} size={104} />
              <small>Before</small>
            </div>
            <span className={styles.arrow}>→</span>
            <div>
              <ScoreRing value={after?.score ?? 0} size={140} />
              <small>With the AI-ready website</small>
            </div>
          </div>
        </div>
        <div>
          <h2 className={styles.h2}>What AI sees about you</h2>
          <dl className={styles.entities}>
            {s.entities.map((e) => (
              <div key={e.label} data-missing={e.value === "Missing" || undefined}>
                <dt>{e.label}</dt>
                <dd>{e.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Readiness checks (original site)</h2>
          {before && <CheckList cat={before} />}
        </section>
        <section className={styles.panel}>
          <h2>Recommendations</h2>
          <ul className={styles.recs}>
            {(before?.recommendations.length ? before.recommendations : ["Your site already covers the basics. Keep prices, hours and FAQs up to date."]).map((r) => (
              <li key={r}>{r}</li>
            ))}
            {s.missingInfo.map((m) => (
              <li key={m}>Add to your site: {m}</li>
            ))}
          </ul>
        </section>
      </div>

      <section className={styles.panel}>
        <h2>Already done for you</h2>
        <p className="muted" style={{ margin: "0 0 14px" }}>
          Your new Weblyy website already includes all of this. Nothing for you to do. If you keep your old website too, ask for the free setup in
          &ldquo;Go live&rdquo; and our team will add it there.
        </p>
        <details className={styles.dev}>
          <summary>Technical details (for your web developer)</summary>
        <div className={styles.gen}>
          <CodeBlock label="Meta title" code={s.metaTitle} />
          <CodeBlock label="Meta description" code={s.metaDescription} />
          <CodeBlock label="Business summary (for your About section)" code={s.summary} />
          <CodeBlock label="Structured data (JSON-LD), paste in <head>" code={s.jsonLd.map((j) => `<script type="application/ld+json">\n${JSON.stringify(j, null, 2)}\n</script>`).join("\n")} />
          <CodeBlock label="llms.txt (plain-text summary for AI crawlers)" code={s.llmsTxt} />
        </div>
        </details>
      </section>

      <section className={styles.panel}>
        <h2>FAQs to publish ({s.faqs.length})</h2>
        <div className={styles.faqs}>
          {s.faqs.map((f) => (
            <details key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------ Lead Center */

const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

const STATUS_LABEL: Record<CCLead["status"], string> = { new: "New", qualified: "Qualified", booked: "Booked", converted: "Converted", lost: "Lost" };

export function LeadsTab({ data, act }: { data: CCData; act: Act }) {
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState("");
  const [note, setNote] = useState("");
  const leads = data.leads;
  const count = (f: (l: CCLead) => boolean) => leads.filter(f).length;
  const run = async (id: string, payload: Record<string, unknown>, done: string) => {
    setBusy(id);
    try {
      await act(payload);
      setNote(done);
      setTimeout(() => setNote(""), 2500);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "That didn't work.");
    } finally {
      setBusy("");
    }
  };
  return (
    <div className={styles.stack}>
      <Head kicker="Customers" title={<>People who want to buy, <span className="em">in one list.</span></>} />
      <section className={styles.cards}>
        <div className={styles.stat}>
          <small>Total leads</small>
          <b>{leads.length}</b>
        </div>
        <div className={styles.stat}>
          <small>New</small>
          <b>{count((l) => l.status === "new")}</b>
        </div>
        <div className={styles.stat}>
          <small>Qualified</small>
          <b>{count((l) => l.status === "qualified")}</b>
        </div>
        <div className={styles.stat}>
          <small>Booked / converted</small>
          <b>{count((l) => l.status === "booked" || l.status === "converted")}</b>
        </div>
      </section>
      {note && (
        <p className={styles.toast} role="status">
          {note}
        </p>
      )}
      {leads.length === 0 ? (
        <section className={styles.empty}>
          <b>No leads yet</b>
          <p className="muted">
            Open your AI-ready website or the AI Agent tab, ask about a service, then share a name and phone number. The lead appears here within seconds,
            qualified.
          </p>
        </section>
      ) : (
        <div className={styles.table} role="table" aria-label="Leads">
          <div className={styles.tr} role="row" data-head>
            <span role="columnheader">Lead</span>
            <span role="columnheader">Interest</span>
            <span role="columnheader">Source</span>
            <span role="columnheader">AI qualification</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">When</span>
          </div>
          {leads.map((l) => (
            <div key={l.id} className={styles.leadRow} data-open={open === l.id || undefined}>
              <button className={styles.tr} role="row" onClick={() => setOpen(open === l.id ? null : l.id)} aria-expanded={open === l.id}>
                <span role="cell" className={styles.who}>
                  <b>{l.name || "Unnamed"}</b>
                  <small>{l.phone || l.email || "No contact"}</small>
                </span>
                <span role="cell">{l.interest}</span>
                <span role="cell" className="muted">
                  {l.source}
                </span>
                <span role="cell">
                  <span className={styles.temp} data-t={l.temperature}>
                    {l.temperature} · {l.score}
                  </span>
                </span>
                <span role="cell">
                  <span className={styles.leadStatus} data-s={l.status}>
                    {STATUS_LABEL[l.status]}
                  </span>
                </span>
                <span role="cell" className="muted">
                  {ago(l.createdAt)}
                </span>
              </button>
              {open === l.id && (
                <motion.div className={styles.detail} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
                  <div>
                    <h3>Why the AI qualified this lead</h3>
                    <ul className={styles.why}>
                      {l.qualification.map((q) => (
                        <li key={q}>{q}</li>
                      ))}
                    </ul>
                    <div className="chips" style={{ marginTop: 12 }}>
                      {(["new", "qualified", "booked", "converted", "lost"] as const).map((s) => (
                        <button
                          key={s}
                          className="chip"
                          aria-pressed={l.status === s}
                          disabled={busy === l.id}
                          onClick={() => run(l.id, { action: "status", leadId: l.id, status: s }, `Marked as ${STATUS_LABEL[s]}`)}
                        >
                          {STATUS_LABEL[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3>Follow-up {l.followUpSent && <Status level="good">Sent</Status>}</h3>
                    <p className={styles.followUp}>{l.followUp}</p>
                    <div className="chips">
                      {!l.from.startsWith("form-") && (
                        <button
                          className="btn btn-primary btn-sm"
                          disabled={busy === l.id || l.followUpSent}
                          onClick={() => run(l.id, { action: "followup", leadId: l.id }, "Follow-up sent to the customer's chat")}
                        >
                          {l.followUpSent ? "Follow-up sent" : "Send in their chat"}
                        </button>
                      )}
                      {l.phone && (
                        <a
                          className={`btn ${l.from.startsWith("form-") ? "btn-primary" : "btn-ghost"} btn-sm`}
                          href={`https://wa.me/${waNumber(l.phone)}?text=${encodeURIComponent(l.followUp)}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => {
                            if (!l.followUpSent) run(l.id, { action: "followup", leadId: l.id, channel: "external" }, "Marked as followed up on WhatsApp");
                          }}
                        >
                          Send on WhatsApp
                        </a>
                      )}
                      {l.phone && (
                        <a className="btn btn-ghost btn-sm" href={`tel:${l.phone.replace(/\s/g, "")}`}>
                          Call {l.phone}
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------ Automations */

export function AutomationsTab({ data, act }: { data: CCData; act: Act }) {
  const [busy, setBusy] = useState("");
  return (
    <div className={styles.stack}>
      <Head kicker="Autopilot" title={<>Jobs your assistant <span className="em">does for you.</span></>} />
      <div className={styles.autos}>
        {data.automations.map((a) => {
          const state = a.requires === "twilio" && !a.ready ? "setup" : a.requires === "n8n" ? "export" : a.on ? "on" : "off";
          return (
            <section key={a.key} className={styles.auto} data-state={state}>
              <div className={styles.autoTop}>
                <div>
                  <h3>{a.name}</h3>
                  <small className="muted">When: {a.trigger}</small>
                </div>
                {a.toggleable && state !== "setup" ? (
                  <button
                    className={styles.toggle}
                    role="switch"
                    aria-checked={a.on}
                    aria-label={`${a.name}: ${a.on ? "on" : "off"}`}
                    disabled={busy === a.key}
                    onClick={async () => {
                      setBusy(a.key);
                      try {
                        await act({ action: "automation", automation: a.key, on: !a.on });
                      } finally {
                        setBusy("");
                      }
                    }}
                  >
                    <span />
                  </button>
                ) : (
                  <Status level={state === "setup" ? "warn" : "good"}>{state === "setup" ? "Needs Twilio" : state === "export" ? "Export in Settings" : "Always on"}</Status>
                )}
              </div>
              <div className={styles.flow}>
                {a.steps.map((s, i) => (
                  <span key={i}>{s}</span>
                ))}
              </div>
              <p className="muted">{a.description}</p>
              <small className={styles.autoMeta}>
                {a.runs} run{a.runs === 1 ? "" : "s"}
                {a.lastRun ? ` · last ${ago(a.lastRun)}` : ""}
              </small>
            </section>
          );
        })}
      </div>
      <section className={styles.panel}>
        <h2>Run log</h2>
        <RunList runs={data.runs} />
      </section>
    </div>
  );
}

/* --------------------------------------------------------------- Analytics */

const INTENT_LABEL: Record<string, string> = {
  price: "Price questions",
  booking: "Booking requests",
  hours: "Timings",
  location: "Location",
  service_info: "Service questions",
  complaint: "Complaints",
  refund: "Refunds",
  medical: "Medical questions",
  greeting: "Greetings",
  thanks: "Thanks",
  other: "Other",
};

function Bars({ rows }: { rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  if (!rows.length) return <p className="muted">No data yet.</p>;
  return (
    <ul className={styles.bars}>
      {rows.map(([label, n]) => (
        <li key={label}>
          <span>{label}</span>
          <div>
            <motion.i initial={{ scaleX: 0 }} animate={{ scaleX: n / max }} transition={{ duration: 0.7 }} />
          </div>
          <b>{n}</b>
        </li>
      ))}
    </ul>
  );
}

export function AnalyticsTab({ data }: { data: CCData }) {
  const s = data.stats;
  const leads = data.leads.length;
  const qualified = data.leads.filter((l) => l.status !== "new" && l.status !== "lost").length;
  const booked = data.leads.filter((l) => l.status === "booked" || l.status === "converted").length;
  const agentShare = s.messages ? Math.round((s.handledByAgent / s.messages) * 100) : 0;
  return (
    <div className={styles.stack}>
      <Head kicker="Results" title={<>What your assistant <span className="em">did for you.</span></>} />
      <section className={styles.cards}>
        <div className={styles.stat}>
          <small>Conversations</small>
          <b>{s.conversations}</b>
        </div>
        <div className={styles.stat}>
          <small>Messages answered</small>
          <b>{s.messages}</b>
        </div>
        <div className={styles.stat}>
          <small>Handled by the agent</small>
          <b>{agentShare}%</b>
        </div>
        <div className={styles.stat}>
          <small>Sent to the owner</small>
          <b>{s.escalations}</b>
        </div>
        <div className={styles.stat}>
          <small>Typing time saved</small>
          <b>{s.minutesSaved} min</b>
        </div>
        <div className={styles.stat}>
          <small>Leads</small>
          <b>{leads}</b>
        </div>
      </section>
      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Conversion funnel</h2>
          <Bars rows={[["Conversations", s.conversations], ["Leads captured", leads], ["Qualified", qualified], ["Booked / converted", booked]]} />
        </section>
        <section className={styles.panel}>
          <h2>What customers ask</h2>
          <Bars rows={Object.entries(data.analytics.intents).map(([k, v]) => [INTENT_LABEL[k] ?? k, v] as [string, number]).sort((a, b) => b[1] - a[1])} />
        </section>
      </div>
      <section className={styles.panel}>
        <h2>Leads by source</h2>
        <Bars rows={Object.entries(data.analytics.bySource).sort((a, b) => b[1] - a[1])} />
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- Settings */

export function SettingsTab({ data, ownerKey }: { data: CCData; ownerKey: string }) {
  const origin = useOrigin();
  const k = data.business;
  return (
    <div className={styles.stack}>
      <Head kicker="Settings" title={<>Business profile <span className="em">& connections.</span></>} />
      <div className={styles.two}>
        <section className={styles.panel}>
          <h2>Business profile</h2>
          <dl className={styles.entities}>
            <div>
              <dt>Name</dt>
              <dd>{k.name}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd style={{ textTransform: "capitalize" }}>{k.type}</dd>
            </div>
            <div>
              <dt>Source</dt>
              <dd>
                <a href={k.url} target="_blank" rel="noreferrer">
                  {k.url}
                </a>
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>{k.address || "Not found"}</dd>
            </div>
            <div>
              <dt>Hours</dt>
              <dd>{k.hours[0] ?? "Not found"}</dd>
            </div>
            <div>
              <dt>Knowledge</dt>
              <dd>
                {k.prices.length} prices · {k.faqs.length} FAQs · {k.pages} pages
              </dd>
            </div>
          </dl>
          <a className="btn btn-ghost btn-sm" href={`/scan?url=${encodeURIComponent(data.workspace?.sourceUrl ?? k.url)}`}>
            Re-run the audit after updating your site
          </a>
        </section>
        <section className={styles.panel}>
          <h2>Connections</h2>
          <ul className={styles.caps}>
            <li>
              <span aria-hidden="true">{data.integrations.twilio ? "✓" : "!"}</span>
              <div>
                <b>WhatsApp</b>
                <small>{data.integrations.twilio ? "Connected" : "Not connected yet. Our team connects your WhatsApp number during the free setup."}</small>
              </div>
            </li>
            <li>
              <span aria-hidden="true">{data.integrations.n8n ? "✓" : "↓"}</span>
              <div>
                <b>Other business tools</b>
                <small>{data.integrations.n8n ? "Connected" : "Optional, for businesses with their own tools. We handle it during setup if you need it."}</small>
              </div>
            </li>
            <li>
              <span aria-hidden="true">✓</span>
              <div>
                <b>Owner inbox</b>
                <small>
                  <a href={data.links.ownerPath} target="_blank" rel="noreferrer">
                    Open on your phone
                  </a>{" "}
                  and add it to your home screen.
                </small>
              </div>
            </li>
          </ul>
        </section>
      </div>
      <section className={styles.panel}>
        <h2>Put the assistant on your old website too</h2>
        <p className="muted" style={{ margin: "0 0 14px" }}>
          Don&apos;t worry about this part. Use &ldquo;Go live&rdquo; and we&apos;ll set it up for you, or send it to your web person in one tap.
        </p>
        <details className={styles.dev}>
          <summary>Technical details (for your web developer)</summary>
        <div className={styles.gen}>
          <CodeBlock label="Website chat bubble (paste before </body>)" code={`<script src="{ORIGIN}/widget.js" data-agent="${data.id}" async></script>`} />
          <CodeBlock label="Chat link (Instagram bio, Google profile, QR code)" code={`{ORIGIN}${data.links.chatPath}`} />
          <CodeBlock label="WhatsApp webhook (Twilio sandbox: When a message comes in)" code={`{ORIGIN}${data.links.whatsappWebhookPath}`} />
          <CodeBlock label="Command Center link (keep it private)" code={`{ORIGIN}/dashboard/${data.id}?key=${ownerKey}`} />
        </div>
        </details>
        {!origin && null}
      </section>
    </div>
  );
}
