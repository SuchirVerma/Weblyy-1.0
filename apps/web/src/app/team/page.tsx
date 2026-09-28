import { headers } from "next/headers";
import { allSetupRequests } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Setup requests | Weblyy team", robots: { index: false } };

/** For the Weblyy team: every business that asked for a done-for-you setup. */
export default async function TeamPage({ searchParams }: PageProps<"/team">) {
  const { key } = await searchParams;
  const host = (await headers()).get("host") ?? "";
  const local = /^(localhost|127\.0\.0\.1)(:\d+)?$/.test(host);
  const adminKey = process.env.ADMIN_KEY;
  const ok = adminKey ? key === adminKey : local;
  if (!ok) {
    return (
      <main id="main" style={{ padding: 40 }}>
        <p>Not available. Set ADMIN_KEY and open /team?key=…</p>
      </main>
    );
  }
  const reqs = await allSetupRequests();
  return (
    <main id="main" className="wrap" style={{ paddingTop: 40, paddingBottom: 80, display: "grid", gap: 20 }}>
      <h1 className="h-display" style={{ fontSize: "2rem" }}>
        Setup requests <span className="em">({reqs.length})</span>
      </h1>
      {reqs.length === 0 && <p className="muted">No requests yet.</p>}
      {reqs.map((r) => (
        <div key={r.id} className="card" style={{ padding: 20, display: "grid", gap: 6 }}>
          <b style={{ fontSize: "1.1rem" }}>{r.business}</b>
          <span>
            {r.name} · <a href={`tel:${r.phone.replace(/\s/g, "")}`}>{r.phone}</a> ·{" "}
            <a href={`https://wa.me/${r.phone.replace(/\D/g, "").replace(/^(\d{10})$/, "91$1")}`} target="_blank" rel="noreferrer">
              WhatsApp
            </a>
          </span>
          <span className="muted">
            Website: {r.platform} · Call: {r.bestTime} · {new Date(r.at).toLocaleString("en-IN")}
          </span>
          {r.note && <span>“{r.note}”</span>}
          <span className="muted" style={{ fontSize: ".85rem" }}>
            Agent ID for the snippet: <code>{r.agentId}</code>
          </span>
        </div>
      ))}
    </main>
  );
}
