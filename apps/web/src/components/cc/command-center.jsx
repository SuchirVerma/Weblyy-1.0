"use client";
import Link from "next/link";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { BackButton, Logo } from "../ui";
import { GoLive } from "./go-live";
import { AgentTab, AnalyticsTab, AutomationsTab, LeadsTab, OverviewTab, SearchTab, SettingsTab, WebsiteTab } from "./tabs";
import { rememberDashboard } from "@/lib/my-dashboards";
import styles from "./cc.module.css";
const TABS = [
  { key: "overview", label: "Home", icon: "⌂" },
  { key: "golive", label: "Go live", icon: "➜" },
  { key: "website", label: "My website", icon: "▭" },
  { key: "agent", label: "Chats", icon: "✦" },
  { key: "leads", label: "Customers", icon: "◉" },
  { key: "search", label: "Get found online", icon: "⌕" },
  { key: "automations", label: "Autopilot", icon: "⇄" },
  { key: "analytics", label: "Results", icon: "▤" },
  { key: "settings", label: "Settings", icon: "⚙" },
];
function subscribeHash(cb) {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
}
export function CommandCenter({ id, ownerKey, initial }) {
  const [data, setData] = useState(initial);
  const [error, setError] = useState("");
  const hash = useSyncExternalStore(
    subscribeHash,
    () => window.location.hash.slice(1),
    () => "",
  );
  const tab = TABS.some((t) => t.key === hash) ? hash : "overview";
  const go = useCallback((t) => {
    if (window.location.hash.slice(1) === t) return;
    history.pushState(null, "", `#${t}`);
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
    let timer;
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
    async (payload) => {
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
  // Remember this dashboard in this browser, so the "Dashboard" menu link comes straight back here.
  const bizName = data?.business.name;
  const bizType = data?.business.type;
  useEffect(() => {
    if (bizName) rememberDashboard({ id, key: ownerKey, name: bizName, type: bizType ?? "" });
  }, [id, ownerKey, bizName, bizType]);
  const newLeads = data?.leads.filter((l) => l.status === "new" || l.status === "qualified").length ?? 0;
  return (
    <div className={styles.shell}>
      <aside className={styles.side}>
        <div className={styles.sideTop}>
          <BackButton />
          <Link href="/" className={styles.brand} aria-label="Weblyy home">
            <Logo size={24} />
            Weblyy
          </Link>
        </div>
        <div className={styles.biz}>
          <span className={styles.bizMark}>{data?.business.name.slice(0, 1) ?? "·"}</span>
          <div>
            <b>{data?.business.name ?? "Loading…"}</b>
            <small>Your Weblyy dashboard</small>
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
            {tab === "overview" && <OverviewTab data={data} go={go} act={act} />}
            {tab === "golive" && <GoLive data={data} ownerKey={ownerKey} />}
            {tab === "website" && <WebsiteTab data={data} act={act} />}
            {tab === "agent" && <AgentTab data={data} ownerKey={ownerKey} />}
            {tab === "search" && <SearchTab data={data} />}
            {tab === "leads" && <LeadsTab data={data} act={act} />}
            {tab === "automations" && <AutomationsTab data={data} act={act} />}
            {tab === "analytics" && <AnalyticsTab data={data} />}
            {tab === "settings" && <SettingsTab data={data} ownerKey={ownerKey} act={act} />}
          </div>
        )}
      </main>
    </div>
  );
}
