"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Logo } from "../ui";
import { AgentTab, AnalyticsTab, AutomationsTab, LeadsTab, OverviewTab, SearchTab, SettingsTab, WebsiteTab } from "./tabs";
import type { CCData } from "./types";
import styles from "./cc.module.css";

const TABS = [
  { key: "overview", label: "Overview", icon: "◎" },
  { key: "website", label: "Website", icon: "▭" },
  { key: "agent", label: "AI Agent", icon: "✦" },
  { key: "search", label: "AI Search", icon: "⌕" },
  { key: "leads", label: "Leads", icon: "◉" },
  { key: "automations", label: "Automations", icon: "⇄" },
  { key: "analytics", label: "Analytics", icon: "▤" },
  { key: "settings", label: "Settings", icon: "⚙" },
] as const;
export type TabKey = (typeof TABS)[number]["key"];

function subscribeHash(cb: () => void) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}

export function CommandCenter({ id, ownerKey, initial }: { id: string; ownerKey: string; initial: CCData }) {
  const [data, setData] = useState<CCData | null>(initial);
  const [error, setError] = useState("");
  const hash = useSyncExternalStore(subscribeHash, () => window.location.hash.slice(1), () => "");
  const tab: TabKey = TABS.some((t) => t.key === hash) ? (hash as TabKey) : "overview";

  const go = useCallback((t: TabKey) => {
    history.replaceState(null, "", `#${t}`);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/workspace/${id}?key=${encodeURIComponent(ownerKey)}`, { cache: "no-store" });
      const d = await res.json();
      if (!res.ok) throw new Error(d?.error || "Couldn't load.");
      setData(d);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load.");
    }
  }, [id, ownerKey]);

  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout>;
    const loop = async () => {
      if (!document.hidden) await load();
      if (alive) timer = setTimeout(loop, 4000);
    };
    timer = setTimeout(loop, 4000);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [load]);

  const act = useCallback(
    async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/workspace/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: ownerKey, ...payload }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d?.error || "That didn't work.");
      await load();
      return d;
    },
    [id, ownerKey, load],
  );

  const newLeads = data?.leads.filter((l) => l.status === "new" || l.status === "qualified").length ?? 0;

  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <Link href="/" className={styles.brand} aria-label="Weblyy home">
          <Logo size={24} />
          Weblyy
        </Link>
        <div className={styles.biz}>
          <span className={styles.bizMark}>{data?.business.name.slice(0, 1) ?? "·"}</span>
          <div>
            <b>{data?.business.name ?? "Loading…"}</b>
            <small>AI Business Command Center</small>
          </div>
        </div>
        <nav className={styles.nav} aria-label="Command Center">
          {TABS.map((t) => (
            <button key={t.key} onClick={() => go(t.key)} aria-current={tab === t.key ? "page" : undefined} data-on={tab === t.key || undefined}>
              <span aria-hidden="true">{t.icon}</span>
              {t.label}
              {t.key === "leads" && newLeads > 0 && <em>{newLeads}</em>}
            </button>
          ))}
        </nav>
        <div className={styles.sideFoot}>
          <span className="dot" /> All systems live
        </div>
      </aside>

      <main id="main" tabIndex={-1} className={styles.main}>
        {error && !data && (
          <div className="err" role="alert">
            {error}
          </div>
        )}
        {!data && !error && <div className={styles.loading}>Loading your Command Center…</div>}
        {data && (
          <div key={tab} className={styles.tabIn}>
              {tab === "overview" && <OverviewTab data={data} go={go} />}
              {tab === "website" && <WebsiteTab data={data} />}
              {tab === "agent" && <AgentTab data={data} ownerKey={ownerKey} />}
              {tab === "search" && <SearchTab data={data} />}
              {tab === "leads" && <LeadsTab data={data} act={act} />}
              {tab === "automations" && <AutomationsTab data={data} act={act} />}
              {tab === "analytics" && <AnalyticsTab data={data} />}
              {tab === "settings" && <SettingsTab data={data} ownerKey={ownerKey} />}
          </div>
        )}
      </main>
    </div>
  );
}
