import { headers } from "next/headers";
import { TeamRetry } from "@/components/team-retry";
import { deliveryConfig, outboxItems } from "@/lib/outbox";
import { teamAllowed } from "@/lib/team-auth";
export const dynamic = "force-dynamic";
export const metadata = { title: "Setup requests | Weblyy team", robots: { index: false } };
const when = (t) => new Date(t).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
function Badge({ label, d }) {
  const tone = d.status === "sent" ? "var(--ok)" : d.status === "failed" ? "var(--bad)" : "var(--warn)";
  const text =
    d.status === "sent"
      ? `${label} sent`
      : d.status === "failed"
        ? `${label} failed · retry ${when(d.nextAt)}`
        : d.status === "waiting-setup"
          ? `${label} waiting for setup`
          : `${label} sending…`;
  return (
    <span title={d.lastError || d.result} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: ".8rem", fontWeight: 600, color: tone }}>
      <i style={{ width: 8, height: 8, borderRadius: "50%", background: tone }} /> {text}
      {d.attempts > 1 && <small style={{ color: "var(--faint)", fontWeight: 400 }}>({d.attempts} tries)</small>}
    </span>
  );
}
/** For the Weblyy team: every free setup call request, and whether its SMS and sheet row went out. */
export default async function TeamPage({ searchParams }) {
  const { key } = await searchParams;
  const host = (await headers()).get("host") ?? "";
  if (!teamAllowed(host, key)) {
    return (
      <main id="main" style={{ padding: 40 }}>
        <p>Not available. Set ADMIN_KEY and open /team?key=…</p>
      </main>
    );
  }
  const items = await outboxItems();
  const cfg = deliveryConfig();
  const pending = items.filter((i) => i.sms.status !== "sent" || i.sheet.status !== "sent").length;
  return (
    <main id="main" className="wrap" style={{ paddingTop: 40, paddingBottom: 80, display: "grid", gap: 20 }}>
      <h1 className="h-display" style={{ fontSize: "2rem" }}>
        Free setup call requests <span className="em">({items.length})</span>
      </h1>

      <section className="card" style={{ padding: 18, display: "flex", flexWrap: "wrap", gap: "10px 24px", alignItems: "center" }}>
        <span>
          SMS to <b>{cfg.smsTo}</b>: {cfg.sms ? <b style={{ color: "var(--ok)" }}>on ({cfg.sms})</b> : <b style={{ color: "var(--warn)" }}>not set up</b>}
        </span>
        <span>Google Sheet: {cfg.sheet ? <b style={{ color: "var(--ok)" }}>connected</b> : <b style={{ color: "var(--warn)" }}>not connected</b>}</span>
        <span className="muted">{pending ? `${pending} request(s) still to deliver. They retry by themselves.` : "Everything delivered."}</span>
        {pending > 0 && <TeamRetry adminKey={typeof key === "string" ? key : undefined} />}
      </section>

      {items.length === 0 && <p className="muted">No requests yet.</p>}
      {items.map((i) => {
        const r = i.request;
        return (
          <div key={i.id} className="card" style={{ padding: 20, display: "grid", gap: 6 }}>
            <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8 }}>
              <b style={{ fontSize: "1.1rem" }}>{r.name}</b>
              <span className="muted" style={{ fontSize: ".85rem" }}>
                {when(i.createdAt)}
              </span>
            </div>
            <span>
              <a href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a> ·{" "}
              <a href={`https://wa.me/${r.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            </span>
            <span>
              <b>Needs:</b> {r.goal}
            </span>
            <span className="muted">
              {r.business} · {r.platform} · call {r.bestTime}
            </span>
            {r.note && <span>“{r.note}”</span>}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 16, marginTop: 4 }}>
              <Badge label="SMS" d={i.sms} />
              <Badge label="Sheet" d={i.sheet} />
            </div>
            {(i.sms.lastError || i.sheet.lastError) && (
              <small className="muted" style={{ overflowWrap: "anywhere" }}>
                {[i.sms.lastError && `SMS: ${i.sms.lastError}`, i.sheet.lastError && `Sheet: ${i.sheet.lastError}`].filter(Boolean).join(" · ")}
              </small>
            )}
          </div>
        );
      })}
    </main>
  );
}
