"use client";
import { motion } from "motion/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Arrow, ScanBar } from "./ui";
import styles from "./find.module.css";

interface Result {
  title: string;
  url: string;
  host: string;
  snippet: string;
  kind: "website" | "instagram" | "directory" | "social";
  best?: boolean;
}

const KIND = {
  website: { label: "Website", tone: "var(--accent)" },
  instagram: { label: "Instagram", tone: "var(--ch-social)" },
  social: { label: "Social page", tone: "var(--ch-web)" },
  directory: { label: "Listing site", tone: "var(--faint)" },
} as const;

function scanTarget(r: Result) {
  if (r.kind === "instagram") {
    const handle = new URL(r.url).pathname.replace(/\//g, "");
    return `@${handle}`;
  }
  // Start from the homepage: search results often point at a blog post or inner page.
  return r.kind === "website" ? new URL(r.url).origin : r.url;
}

export function FindResults({ q }: { q: string }) {
  const [state, setState] = useState<{ loading: boolean; error: string; results: Result[] }>({ loading: Boolean(q), error: "", results: [] });

  useEffect(() => {
    if (!q) return;
    const ctrl = new AbortController();
    fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Search failed.");
        setState({ loading: false, error: "", results: d.results });
      })
      .catch((e) => {
        if (ctrl.signal.aborted) return;
        setState({ loading: false, error: e instanceof Error ? e.message : "Search failed.", results: [] });
      });
    return () => ctrl.abort();
  }, [q]);

  const { loading, error, results } = state;

  return (
    <div className={`wrap ${styles.find}`}>
      <div className={styles.head}>
        <p className="kicker">Find a business</p>
        <h1 className="h-display" style={{ fontSize: "clamp(2rem, 4.4vw, 3.2rem)" }}>
          {q ? (
            <>
              Which one is <span className="em">{q}</span>?
            </>
          ) : (
            <>
              Search by <span className="em">name</span>, website or @instagram.
            </>
          )}
        </h1>
        <p className="lede">Pick the business&apos;s own website if it has one. No website? Pick its Instagram profile and we&apos;ll scan that.</p>
      </div>

      <div style={{ maxWidth: 640 }}>
        <ScanBar compact initial={q} />
      </div>

      {loading && (
        <ul className={styles.list} aria-busy="true" aria-label="Searching">
          {[0, 1, 2, 3].map((i) => (
            <li key={i} className={styles.skeleton} />
          ))}
        </ul>
      )}

      {error && (
        <div className="err" role="alert">
          {error}
        </div>
      )}

      {!loading && !error && q && results.length === 0 && (
        <div className="err" role="status">
          Nothing found for &ldquo;{q}&rdquo;. Try adding the area (for example &ldquo;{q} Rohini&rdquo;), or paste the website or @instagram handle.
        </div>
      )}

      {!loading && results.length > 0 && (
        <ul className={styles.list}>
          {results.map((r, i) => {
            const k = KIND[r.kind];
            return (
              <motion.li
                key={r.url}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className={styles.item}
                data-kind={r.kind}
                data-best={r.best || undefined}
              >
                <div className={styles.meta}>
                  <span className={styles.kind} style={{ ["--tone" as string]: k.tone }}>
                    {k.label}
                  </span>
                  <span className="mono muted">{r.kind === "instagram" ? scanTarget(r) : r.host}</span>
                  {r.best && <span className={styles.best}>Best match</span>}
                </div>
                <b className={styles.title}>{r.title || r.host}</b>
                {r.snippet && <p className="muted">{r.snippet}</p>}
                {r.kind === "directory" && <p className={styles.note}>This is a listing site, not the business&apos;s own page. Results may be thin or blocked.</p>}
                <div className={styles.actions}>
                  <Link className={`btn ${r.kind === "directory" || r.kind === "social" ? "btn-ghost" : "btn-primary"} btn-sm`} href={`/scan?url=${encodeURIComponent(scanTarget(r))}`}>
                    Scan this <Arrow />
                  </Link>
                  <a className={styles.visit} href={r.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
