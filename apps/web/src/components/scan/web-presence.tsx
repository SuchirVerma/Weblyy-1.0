import type { WebPresence } from "@/lib/types";
import scan from "./scan.module.css";
import styles from "./web-presence.module.css";

/** What a web search for the business turned up: its own site, maps, directories, social and ratings. */
export function WebPresencePanel({ presence }: { presence: WebPresence }) {
  const { listings } = presence;
  return (
    <section className={scan.findings} aria-labelledby="web-h">
      <div>
        <h2 id="web-h" className={scan.h2}>
          Found on the web
        </h2>
        <p className="muted">
          We searched for <b>&ldquo;{presence.query}&rdquo;</b>, the way a customer or an AI assistant would.
        </p>
      </div>
      {!presence.searched ? (
        <p className="muted">Search engines didn&rsquo;t respond this time, so this wasn&rsquo;t checked.</p>
      ) : (
        <>
          <p className={styles.own} data-ok={presence.ownSiteFound || undefined}>
            <span aria-hidden="true">{presence.ownSiteFound ? "✓" : "!"}</span>
            {presence.ownSiteFound ? "Your website shows up when people search your name." : "Your website doesn't show up when people search your name."}
          </p>
          {listings.length ? (
            <ul className={styles.list}>
              {listings.map((l) => (
                <li key={l.platform}>
                  <a href={l.url} target="_blank" rel="noreferrer">
                    <b>{l.platform}</b>
                    <small>{l.title}</small>
                  </a>
                  {l.rating ? (
                    <span className={styles.rating}>
                      {l.rating}★{l.reviews ? <small> {l.reviews} reviews</small> : null}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Not found on Google Maps, Justdial or any other directory. Customers searching for you only find competitors.</p>
          )}
        </>
      )}
    </section>
  );
}
