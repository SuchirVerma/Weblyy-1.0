"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { dashboardHref, forgetDashboard, savedDashboards, type SavedDashboard } from "@/lib/my-dashboards";
import { ScanBar } from "./ui";
import styles from "./my-dashboards.module.css";

const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  if (m < 1440) return `${Math.round(m / 60)} h ago`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

/** The Dashboard menu link: opens your dashboard directly, or lets you pick one if you have several. */
export function MyDashboards() {
  const router = useRouter();
  const [list, setList] = useState<SavedDashboard[] | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      // Drop dashboards that no longer exist, so the owner never lands on a dead link.
      const checked = await Promise.all(
        savedDashboards().map(async (d) => {
          try {
            const r = await fetch(`/api/workspace/${d.id}?key=${encodeURIComponent(d.key)}`, { cache: "no-store" });
            if (r.ok) return d;
            if (r.status === 404 || r.status === 401 || r.status === 403) forgetDashboard(d.id);
            return r.status >= 500 ? d : null;
          } catch {
            return d;
          }
        }),
      );
      const ok = checked.filter((d): d is SavedDashboard => Boolean(d));
      if (!alive) return;
      if (ok.length === 1) {
        router.replace(dashboardHref(ok[0]));
        return;
      }
      setList(ok);
    })();
    return () => {
      alive = false;
    };
  }, [router]);

  if (list === null) {
    return (
      <div className={styles.loading} aria-busy="true">
        Opening your dashboard…
      </div>
    );
  }

  if (!list.length) {
    return (
      <section className={styles.empty}>
        <span className={styles.emptyIcon} aria-hidden="true">
          ▤
        </span>
        <h1>No dashboard yet</h1>
        <p>Check your website first. When you click &ldquo;Make My Business AI-Ready&rdquo;, your dashboard is created and saved here.</p>
        <div className={styles.search}>
          <ScanBar compact />
        </div>
      </section>
    );
  }

  const [latest, ...rest] = list;
  return (
    <section className={styles.wrap}>
      <header>
        <p className="kicker">Your dashboards</p>
        <h1>Pick a business</h1>
      </header>
      <Link href={dashboardHref(latest)} className={styles.latest}>
        <span className={styles.mark}>{latest.name.slice(0, 1)}</span>
        <span className={styles.text}>
          <small>Last opened · {ago(latest.at)}</small>
          <b>{latest.name}</b>
          <em>{latest.type}</em>
        </span>
        <span className="btn btn-primary">Open dashboard →</span>
      </Link>
      {rest.length > 0 && (
        <ul className={styles.list}>
          {rest.map((d) => (
            <li key={d.id}>
              <Link href={dashboardHref(d)}>
                <span className={styles.mark} data-small>
                  {d.name.slice(0, 1)}
                </span>
                <span className={styles.text}>
                  <b>{d.name}</b>
                  <small>
                    {d.type} · {ago(d.at)}
                  </small>
                </span>
                <span className={styles.go} aria-hidden="true">
                  →
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className={styles.note}>Saved on this device only. Your private dashboard links stay with you.</p>
    </section>
  );
}
