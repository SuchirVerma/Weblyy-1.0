"use client";
import { useState } from "react";
import styles from "./report.module.css";
const fmtPhone = (p) => {
  const d = p.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 11 && d.startsWith("0")) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
  return p;
};
const waLink = (n) => (/\d{8,}/.test(n) ? `https://wa.me/${n.replace(/\D/g, "")}` : null);
const pathOf = (u) => {
  try {
    return new URL(u).pathname || "/";
  } catch {
    return u;
  }
};
export function reportMarkdown(scan, a) {
  const k = scan.knowledge;
  const lines = [
    `# ${k.name}: Weblyy report`,
    ``,
    `Website: ${k.url}`,
    `Type: ${k.businessType}`,
    `Automation readiness: ${a.readiness}/100`,
    `Time recoverable: ~${a.hoursPerWeek} hrs/week (₹${a.rupeesPerMonth.toLocaleString("en-IN")}/month)`,
    ``,
    a.summary,
    ``,
    `## How customers reach you`,
    ...scan.touchpoints.map((t) => `- ${t.label}: ${t.detail}`),
    ``,
    `## Contact details found`,
    ...k.whatsapp.map((w) => `- WhatsApp: ${fmtPhone(w)}`),
    ...k.phones.map((p) => `- Phone: ${fmtPhone(p)}`),
    ...k.emails.map((e) => `- Email: ${e}`),
    k.address && `- Address: ${k.address}`,
    ...k.socialLinks.map((s) => `- ${s.name}: ${s.url}`),
    ``,
    `## Opening hours`,
    ...(k.hours.length ? k.hours.map((h) => `- ${h}`) : ["- Not listed on the site"]),
    ``,
    `## Prices published (${k.prices.length})`,
    ...(k.prices.length ? k.prices.map((p) => `- ${p.name}: ${p.price}`) : ["- None found"]),
    ``,
    `## FAQs on the site (${k.faqs.length})`,
    ...k.faqs.map((f) => `- **${f.q}** ${f.a}`),
    ``,
    `## Tools detected`,
    ...(k.embeds.length ? k.embeds.map((e) => `- ${e}`) : ["- None"]),
    ``,
    `## Gaps`,
    ...scan.gaps.map((g) => `- ${g}`),
    ``,
    `## Workflows, ranked`,
    ...a.workflows.map((w) => `- **${w.name}** (${w.verdict}, score ${w.score}, ~${w.hoursPerWeek} hrs/week): ${w.description}`),
    ``,
    `## Pages read`,
    ...k.pages.map((p) => `- ${p.title || p.url} (${p.url})`),
  ];
  return lines.filter((l) => typeof l === "string").join("\n");
}
export function SiteReport({ scan, analysis }) {
  const k = scan.knowledge;
  const [allPrices, setAllPrices] = useState(false);
  const [allFaqs, setAllFaqs] = useState(false);
  const prices = allPrices ? k.prices : k.prices.slice(0, 10);
  const faqs = allFaqs ? k.faqs : k.faqs.slice(0, 5);
  const download = () => {
    const blob = new Blob([reportMarkdown(scan, analysis)], { type: "text/markdown" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${k.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-weblyy-report.md`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const last10 = (n) => n.replace(/\D/g, "").slice(-10);
  const waSet = new Set(k.whatsapp.map(last10));
  const phones = k.phones.filter((p) => !waSet.has(last10(p)));
  const contactCount = k.whatsapp.length + phones.length + k.emails.length + (k.address ? 1 : 0);
  return (
    <section className={styles.report} aria-labelledby="report-h">
      <div className={styles.head}>
        <div>
          <p className="kicker">Site report</p>
          <h2 id="report-h" className={styles.h2}>
            Everything we read on {k.name}
          </h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {k.pages.length} page{k.pages.length === 1 ? "" : "s"} read
            {k.rendered ? " · checked in a real browser, so JavaScript content is included" : ""}
          </p>
        </div>
        <div className={styles.headActions}>
          <button className="btn btn-ghost btn-sm" onClick={download}>
            Download report
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => window.print()}>
            Print / PDF
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        <article className={styles.card}>
          <h3>
            Contact details <span className={styles.count}>{contactCount}</span>
          </h3>
          {contactCount === 0 && <p className="muted">No contact details found on the site. That&apos;s a gap on its own.</p>}
          <ul className={styles.kv}>
            {k.whatsapp.map((w) => (
              <li key={`wa${w}`}>
                <span style={{ color: "var(--ch-whatsapp)" }}>{k.phones.some((p) => last10(p) === last10(w)) ? "WhatsApp + call" : "WhatsApp"}</span>
                {waLink(w) ? (
                  <a href={waLink(w)} target="_blank" rel="noreferrer">
                    {fmtPhone(w)}
                  </a>
                ) : (
                  <span>Chat button on the site</span>
                )}
              </li>
            ))}
            {phones.map((p) => (
              <li key={`ph${p}`}>
                <span style={{ color: "var(--ch-phone)" }}>Phone</span>
                <a href={`tel:${p.replace(/[^\d+]/g, "")}`}>{fmtPhone(p)}</a>
              </li>
            ))}
            {k.emails.map((e) => (
              <li key={`em${e}`}>
                <span style={{ color: "var(--ch-email)" }}>Email</span>
                <a href={`mailto:${e}`}>{e}</a>
              </li>
            ))}
            {k.address && (
              <li>
                <span>Address</span>
                <span>
                  {k.address}
                  {k.mapUrl && (
                    <>
                      {" · "}
                      <a href={k.mapUrl} target="_blank" rel="noreferrer">
                        Map
                      </a>
                    </>
                  )}
                </span>
              </li>
            )}
            {k.socialLinks.map((s) => (
              <li key={s.name}>
                <span style={{ color: "var(--ch-social)" }}>{s.name}</span>
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.url
                    .replace(/^https?:\/\/(www\.)?/, "")
                    .replace(/\/$/, "")
                    .slice(0, 40)}
                </a>
              </li>
            ))}
          </ul>
        </article>

        <article className={styles.card}>
          <h3>Opening hours</h3>
          {k.hours.length ? (
            <ul className={styles.plain}>
              {k.hours.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Not listed on the site, so customers have to ask.</p>
          )}
          <h3 style={{ marginTop: 18 }}>Tools and widgets</h3>
          {k.embeds.length ? (
            <div className="chips">
              {k.embeds.map((e) => (
                <span key={e} className={styles.tag}>
                  {e}
                </span>
              ))}
            </div>
          ) : (
            <p className="muted">No booking, chat or payment tools detected.</p>
          )}
          <h3 style={{ marginTop: 18 }}>Forms</h3>
          {k.forms.length ? (
            <ul className={styles.plain}>
              {k.forms.map((f, i) => (
                <li key={i}>
                  <b style={{ textTransform: "capitalize" }}>{f.purpose}</b> on {f.page}: {f.fields.join(", ")}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">No forms found.</p>
          )}
        </article>

        <article className={`${styles.card} ${styles.wide}`}>
          <h3>
            Prices published <span className={styles.count}>{k.prices.length}</span>
          </h3>
          {k.prices.length ? (
            <>
              <table className={styles.table}>
                <tbody>
                  {prices.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td className="mono">{p.price}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {k.prices.length > 10 && (
                <button className={styles.more} onClick={() => setAllPrices(!allPrices)}>
                  {allPrices ? "Show fewer" : `Show all ${k.prices.length}`}
                </button>
              )}
            </>
          ) : (
            <p className="muted">No prices on the site. Every &ldquo;how much?&rdquo; message needs a human, and the agent will hand those to the team.</p>
          )}
        </article>

        <article className={`${styles.card} ${styles.wide}`}>
          <h3>
            Questions the site already answers <span className={styles.count}>{k.faqs.length}</span>
          </h3>
          {k.faqs.length ? (
            <>
              {faqs.map((f) => (
                <details key={f.q} className={styles.faq}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
              {k.faqs.length > 5 && (
                <button className={styles.more} onClick={() => setAllFaqs(!allFaqs)}>
                  {allFaqs ? "Show fewer" : `Show all ${k.faqs.length}`}
                </button>
              )}
            </>
          ) : (
            <p className="muted">No FAQ section. Adding one gives the agent more to answer from.</p>
          )}
        </article>

        <article className={styles.card}>
          <h3>What&apos;s missing</h3>
          {scan.gaps.length ? (
            <ul className={styles.gaps}>
              {scan.gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          ) : (
            <p className="muted">Nothing obvious. This site is well set up.</p>
          )}
        </article>

        <article className={styles.card}>
          <h3>Pages read</h3>
          <ul className={styles.plain}>
            {k.pages.map((p) => (
              <li key={p.url}>
                <a href={p.url} target="_blank" rel="noreferrer">
                  {pathOf(p.url)}
                </a>{" "}
                <span className="muted">{p.title.slice(0, 50)}</span>
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
