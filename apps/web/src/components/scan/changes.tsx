"use client";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Audit, AuditCheck, CategoryKey } from "@/lib/audit";
import styles from "./changes.module.css";

const ICON: Record<CategoryKey, string> = { website: "01", agent: "02", leads: "03", search: "04", automation: "05" };
const SHORT: Record<CategoryKey, string> = { website: "Website", agent: "AI assistant", leads: "Lead capture", search: "Found online", automation: "Autopilot" };

/** The new website's checks are worded for the rebuilt site; these point each one at its old counterpart. */
const SAME_AS: Record<string, string> = {
  "Mobile-first layout": "Mobile-friendly",
  "Clear headline and business description": "Clear headline",
  "Contact details up front": "Contact details visible",
  "Strong calls to action": "Calls to action",
  "Services and prices easy to find": "Services and prices listed",
};

interface Change {
  label: string;
  kind: "new" | "better";
  before: string;
  after: string;
}

function changesFor(before: AuditCheck[], after: AuditCheck[]) {
  const changes: Change[] = [];
  let kept = 0;
  for (const a of after) {
    if (a.ok !== true) continue;
    const b = before.find((x) => x.label === (SAME_AS[a.label] ?? a.label));
    if (b?.ok === true) {
      kept += 1;
      continue;
    }
    changes.push({ label: a.label, kind: b?.ok === "partial" ? "better" : "new", before: b?.detail ?? "Not there before.", after: a.detail });
  }
  return { changes, kept };
}

/** Every improvement Weblyy makes, grouped by area, as before → after cards. */
export function ChangeList({ before, after, name }: { before: Audit; after: Audit; name: string }) {
  const areas = before.categories.map((c) => {
    const a = after.categories.find((x) => x.key === c.key);
    return { key: c.key, label: SHORT[c.key] ?? c.label, from: c.score, to: a?.score ?? c.score, ...changesFor(c.checks, a?.checks ?? []) };
  });
  const total = areas.reduce((n, a) => n + a.changes.length, 0);
  const [sel, setSel] = useState<CategoryKey | "all">("all");
  const all = { key: "all" as const, label: "All changes", changes: areas.flatMap((a) => a.changes.map((c) => ({ ...c, area: a.key }))), kept: areas.reduce((n, a) => n + a.kept, 0) };
  const area = sel === "all" ? all : areas.find((a) => a.key === sel);
  if (!total) return null;

  return (
    <section className={styles.wrap} aria-labelledby="changes-h">
      <header className={styles.head}>
        <div>
          <p className="kicker">What Weblyy changes</p>
          <h2 id="changes-h">
            <span className={styles.total}>{total}</span> improvements to {name}&apos;s website
          </h2>
        </div>
        <p className={styles.legend}>
          <span>
            <span className={styles.kind} data-kind="new">
              New
            </span>{" "}
            added from scratch
          </span>
          <span>
            <span className={styles.kind} data-kind="better">
              Better
            </span>{" "}
            was there, now fixed
          </span>
          <span>Tap any change to see before and after.</span>
        </p>
      </header>

      <div className={styles.tabs} role="tablist" aria-label="Areas">
        <button role="tab" aria-selected={sel === "all"} className={styles.tab} onClick={() => setSel("all")}>
          <span className={styles.tabIcon} aria-hidden="true">
            ✦
          </span>
          <span className={styles.tabText}>
            <b>All changes</b>
            <small>every area</small>
          </span>
          <em>+{total}</em>
        </button>
        {areas.map((a) => (
          <button
            key={a.key}
            role="tab"
            aria-selected={sel === a.key}
            className={styles.tab}
            onClick={() => setSel(a.key)}
            disabled={!a.changes.length && !a.kept}
          >
            <span className={styles.tabIcon} aria-hidden="true">
              {ICON[a.key]}
            </span>
            <span className={styles.tabText}>
              <b>{a.label}</b>
              <small>
                {a.from} → {a.to}
              </small>
            </span>
            <em data-zero={!a.changes.length || undefined}>{a.changes.length ? `+${a.changes.length}` : "✓"}</em>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {area && (
          <motion.div
            key={area.key}
            role="tabpanel"
            className={styles.panel}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {area.changes.length ? (
              <ol className={styles.cards}>
                {area.changes.map((c, i) => (
                  <motion.li
                    key={c.label}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.03 * i, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <details className={styles.card}>
                      <summary className={styles.cardTop}>
                        <span className={styles.cardIcon} aria-hidden="true">
                          {ICON[("area" in c ? c.area : area.key) as CategoryKey]}
                        </span>
                        <span className={styles.cardTitle}>
                          <b>{c.label}</b>
                          <small>{"area" in c ? SHORT[c.area as CategoryKey] : "Tap to see before and after"}</small>
                        </span>
                        <span className={styles.kind} data-kind={c.kind}>
                          {c.kind === "new" ? "New" : "Better"}
                        </span>
                        <span className={styles.chev} aria-hidden="true" />
                      </summary>
                      <div className={styles.compare}>
                        <p data-side="before">
                          <i aria-hidden="true">✕</i>
                          <span>
                            <small>Before</small>
                            {c.before}
                          </span>
                        </p>
                        <p data-side="after">
                          <i aria-hidden="true">✓</i>
                          <span>
                            <small>With Weblyy</small>
                            {c.after}
                          </span>
                        </p>
                      </div>
                    </details>
                  </motion.li>
                ))}
              </ol>
            ) : (
              <p className={styles.none}>Nothing to change here. This part of the website was already in good shape.</p>
            )}
            {area.kept > 0 && (
              <p className={styles.kept}>
                <span aria-hidden="true">✓</span> {area.kept} thing{area.kept === 1 ? " was" : "s were"} already good and stay{area.kept === 1 ? "s" : ""} as they are.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
