"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AreaKey, Improvement, Kept, SiteAudit } from "@/lib/makeover";
import type { StoredMakeover } from "@/lib/store";
import { useReducedSafe } from "../use-reduced";
import styles from "./makeover.module.css";

type Data = StoredMakeover & { previewPath?: string };

const STEPS = [
  { t: "Analyzing the website", d: "Design, UX, mobile, content, SEO, speed, CTAs, missing features" },
  { t: "Keeping what's yours", d: "Name, logo, colours, services, prices, contact details, your own words" },
  { t: "Rebuilding the weak spots", d: "Layout, typography, calls to action, phone experience" },
  { t: "Measuring the new site", d: "The same checks, run again on the redesign" },
];

const fmtPhone = (p: string) => {
  const d = p.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return p;
};
const shot = (f?: string) => (f ? `/api/shot/${f}` : "");
const tone = (s: number) => (s >= 75 ? "good" : s >= 45 ? "warn" : "bad");

/**
 * Website makeover: analysis → keep / improve → the rebuilt site → before and after.
 * Pass `scanId` to build it (report page) or `data` when it's already stored (Command Center).
 */
export function Makeover({ scanId, data: initial, name, siteHref }: { scanId?: string; data?: Data | null; name: string; siteHref?: string }) {
  const [data, setData] = useState<Data | null>(initial ?? null);
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (initial || !scanId) return;
    let live = true;
    const tick = setInterval(() => setStep((s) => Math.min(STEPS.length - 1, s + 1)), 2600);
    fetch(`/api/makeover/${scanId}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || "Couldn't build the redesign.");
        if (live) setData(d);
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Couldn't build the redesign."))
      .finally(() => clearInterval(tick));
    return () => {
      live = false;
      clearInterval(tick);
    };
  }, [scanId, initial, attempt]);

  const href = siteHref ?? data?.previewPath;

  return (
    <section className={styles.wrap} aria-labelledby="mk-h">
      <header className={styles.head}>
        <div>
          <p className="kicker">Website makeover</p>
          <h2 id="mk-h">
            {data ? (
              <>
                {name}&apos;s website, rebuilt from its own content
              </>
            ) : (
              <>Rebuilding {name}&apos;s website</>
            )}
          </h2>
          <p className={styles.sub}>
            Nothing is invented. We keep the business&apos;s own words, prices, photos and contact details, fix what gets in the customer&apos;s way, and run the same checks again on
            the new site.
          </p>
        </div>
        {data && (
          <div className={styles.scoreBox}>
            <span className={styles.scoreLabel}>Website score</span>
            <span className={styles.scoreNums}>
              <b data-tone={tone(data.before.score)}>{data.before.score}</b>
              <span aria-hidden="true">→</span>
              <b data-tone={tone(data.after.score)}>{data.after.score}</b>
            </span>
            {href && (
              <a className="btn btn-primary btn-sm" href={href} target="_blank" rel="noreferrer">
                Open the new website ↗
              </a>
            )}
          </div>
        )}
      </header>

      {!data && !error && (
        <ol className={styles.steps} aria-live="polite">
          {STEPS.map((s, i) => (
            <li key={s.t} data-state={i < step ? "done" : i === step ? "now" : "todo"}>
              <span aria-hidden="true">{i < step ? "✓" : ""}</span>
              <div>
                <b>{s.t}</b>
                <small>{s.d}</small>
              </div>
            </li>
          ))}
        </ol>
      )}
      {error && (
        <div className="err" role="alert">
          {error}{" "}
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setError("");
              setStep(0);
              setAttempt((a) => a + 1);
            }}
          >
            Try again
          </button>
        </div>
      )}

      {data && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }} className={styles.body}>
          <Compare data={data} />
          <Analysis before={data.before} after={data.after} />
          <Engine keep={data.plan.keep} notFound={data.plan.notFound} improve={data.plan.improve} todo={data.plan.ownerTodo} />
        </motion.div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------ before ↔ after */

function Compare({ data }: { data: Data }) {
  const hasMobile = Boolean(data.shots.before.mobile && data.shots.after.mobile);
  const hasDesktop = Boolean(data.shots.before.desktop && data.shots.after.desktop);
  const [device, setDevice] = useState<"desktop" | "mobile">(hasDesktop ? "desktop" : "mobile");
  const [pos, setPos] = useState(50);
  const [mode, setMode] = useState<"slider" | "side">("slider");
  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef(false);

  if (!hasDesktop && !hasMobile) {
    return (
      <p className={styles.noShots}>
        Screenshots need a browser on the server, and none was available for this scan. The analysis below is based on the page&apos;s code.
      </p>
    );
  }
  const before = shot(data.shots.before[device]);
  const after = shot(data.shots.after[device]);

  const move = (clientX: number) => {
    const r = frame.current?.getBoundingClientRect();
    if (r) setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div className={styles.compare}>
      <div className={styles.compareBar}>
        <h3>Before ↔ After</h3>
        <div className={styles.toggles}>
          <div className={styles.seg} role="group" aria-label="Device">
            {hasDesktop && (
              <button aria-pressed={device === "desktop"} onClick={() => setDevice("desktop")}>
                Laptop
              </button>
            )}
            {hasMobile && (
              <button aria-pressed={device === "mobile"} onClick={() => setDevice("mobile")}>
                Phone
              </button>
            )}
          </div>
          <div className={styles.seg} role="group" aria-label="View">
            <button aria-pressed={mode === "slider"} onClick={() => setMode("slider")}>
              Slider
            </button>
            <button aria-pressed={mode === "side"} onClick={() => setMode("side")}>
              Side by side
            </button>
          </div>
        </div>
      </div>

      {mode === "slider" ? (
        <div className={styles.scroller} data-device={device} tabIndex={0} aria-label="Screenshots, scroll to see the whole page">
          <div
            ref={frame}
            className={styles.frame}
            onPointerDown={(e) => {
              drag.current = true;
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              move(e.clientX);
            }}
            onPointerMove={(e) => drag.current && move(e.clientX)}
            onPointerUp={() => (drag.current = false)}
            onPointerCancel={() => (drag.current = false)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={before} alt="The current website" className={styles.shotBefore} draggable={false} />
            <div className={styles.afterLayer} style={{ clipPath: `inset(0 0 0 ${pos}%)` }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={after} alt="The redesigned website" draggable={false} />
            </div>
            <div className={styles.handle} style={{ left: `${pos}%` }} aria-hidden="true">
              <span>⇆</span>
            </div>
            <span className={styles.tag} data-side="before">
              Before
            </span>
            <span className={styles.tag} data-side="after">
              After
            </span>
          </div>
        </div>
      ) : (
        <div className={styles.side} data-device={device}>
          <figure>
            <figcaption>Before</figcaption>
            <div className={styles.sideScroll} tabIndex={0}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={before} alt="The current website" />
            </div>
          </figure>
          <figure>
            <figcaption>After</figcaption>
            <div className={styles.sideScroll} tabIndex={0}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={after} alt="The redesigned website" />
            </div>
          </figure>
        </div>
      )}
      {mode === "slider" && (
        <label className={styles.range}>
          <span className="sr-only">Move the divider between before and after</span>
          <input type="range" min={0} max={100} value={Math.round(pos)} onChange={(e) => setPos(Number(e.target.value))} />
        </label>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ analysis */

function Analysis({ before, after }: { before: SiteAudit; after: SiteAudit }) {
  const [open, setOpen] = useState<AreaKey | null>(null);
  const reduce = useReducedSafe();
  const area = before.areas.find((a) => a.key === open);
  const afterArea = after.areas.find((a) => a.key === open);
  return (
    <div className={styles.analysis}>
      <div className={styles.blockHead}>
        <h3>Website analysis</h3>
        <p className="muted">
          {before.areas.length} areas, {before.areas.reduce((n, a) => n + a.checks.length, 0)} checks, measured in a real browser on a laptop and a phone. Tap an area for the details.
        </p>
      </div>
      <ul className={styles.areas}>
        {before.areas.map((a, i) => {
          const to = after.areas.find((x) => x.key === a.key)?.score ?? a.score;
          return (
            <motion.li key={a.key} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
              <button className={styles.area} aria-expanded={open === a.key} onClick={() => setOpen(open === a.key ? null : a.key)}>
                <span className={styles.areaName}>{a.label}</span>
                <span className={styles.areaNums}>
                  <b data-tone={tone(a.score)}>{a.score}</b>
                  <span aria-hidden="true">→</span>
                  <b data-tone={tone(to)}>{to}</b>
                </span>
                <span className={styles.areaTrack} aria-hidden="true">
                  <span className={styles.areaAfter} style={{ width: `${to}%` }} />
                  <span className={styles.areaNow} data-tone={tone(a.score)} style={{ width: `${a.score}%` }} />
                </span>
                <small>
                  {a.checks.filter((c) => c.ok !== true).length
                    ? `${a.checks.filter((c) => c.ok !== true).length} of ${a.checks.length} need work`
                    : `All ${a.checks.length} checks pass`}
                </small>
              </button>
            </motion.li>
          );
        })}
      </ul>
      <AnimatePresence mode="wait">
        {area && (
          <motion.div key={area.key} className={styles.checks} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <table>
              <caption className="sr-only">{area.label} checks, before and after</caption>
              <thead>
                <tr>
                  <th scope="col">{area.label}</th>
                  <th scope="col">Current site</th>
                  <th scope="col">Redesign</th>
                </tr>
              </thead>
              <tbody>
                {area.checks.map((c) => {
                  const x = afterArea?.checks.find((y) => y.id === c.id);
                  return (
                    <tr key={c.id}>
                      <th scope="row">{c.label}</th>
                      <td data-ok={String(c.ok)}>
                        <Mark ok={c.ok} /> {c.detail}
                      </td>
                      <td data-ok={String(x?.ok)}>
                        {x ? (
                          <>
                            <Mark ok={x.ok} /> {x.detail}
                          </>
                        ) : (
                          <span className="muted">{/^p-(load|mobile)$/.test(c.id) ? "Measured once the new site is live on the internet" : "Not measured"}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Mark({ ok }: { ok: boolean | "partial" }) {
  return (
    <span className={styles.mark} data-ok={String(ok)} aria-label={ok === true ? "Pass" : ok === "partial" ? "Partly" : "Fail"}>
      {ok === true ? "✓" : ok === "partial" ? "!" : "✕"}
    </span>
  );
}

/* --------------------------------------------------------- improvement engine */

const GROUPS: Kept["group"][] = ["Business identity", "Services", "Brand information", "Contact details"];

function Engine({ keep, notFound, improve, todo }: { keep: Kept[]; notFound: string[]; improve: Improvement[]; todo: { label: string; why: string }[] }) {
  const kinds = useMemo(() => [...new Set(improve.map((i) => i.kind))], [improve]);
  return (
    <div className={styles.engine}>
      <div className={styles.col} data-col="keep">
        <div className={styles.colHead}>
          <span className={styles.badge} data-kind="keep">
            Preserved
          </span>
          <h3>Kept exactly as it is</h3>
        </div>
        {GROUPS.map((g) => {
          const items = keep.filter((k) => k.group === g);
          if (!items.length) return null;
          return (
            <div key={g} className={styles.group}>
              <h4>{g}</h4>
              <ul>
                {items.map((k) => (
                  <li key={`${k.label}${k.value}`}>
                    <span className={styles.keepLabel}>{k.label}</span>
                    <span className={styles.keepValue}>
                      {k.swatches?.map((c) => <i key={c} className={styles.swatch} style={{ background: c }} title={c} />)}
                      {k.image && k.label === "Logo" ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={k.image} alt="" className={styles.keepLogo} referrerPolicy="no-referrer" />
                      ) : null}
                      {/Phone|WhatsApp/.test(k.label) ? fmtPhone(k.value) : k.value}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
        {notFound.length > 0 && (
          <div className={styles.notFound}>
            <b>Not on the current site, so not on the new one either</b>
            <p>We don&apos;t make up business details. Add these and they appear on the redesign:</p>
            <ul>
              {notFound.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className={styles.col} data-col="improve">
        <div className={styles.colHead}>
          <span className={styles.badge} data-kind="improve">
            Improved
          </span>
          <h3>
            {improve.length} fix{improve.length === 1 ? "" : "es"}, each measured
          </h3>
        </div>
        {improve.length === 0 && <p className="muted">The current site already passes these checks. The redesign keeps it that way.</p>}
        {kinds.map((kind) => (
          <div key={kind} className={styles.group}>
            <h4>{kind}</h4>
            <ul className={styles.fixes}>
              {improve
                .filter((i) => i.kind === kind)
                .map((i) => (
                  <li key={i.label}>
                    <b>{i.label}</b>
                    <span className={styles.fromTo}>
                      <span data-side="before">{i.before}</span>
                      <span data-side="after">{i.after}</span>
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
        {todo.length > 0 && (
          <div className={styles.todo}>
            <b>Only the owner can fix these</b>
            <ul>
              {todo.map((t) => (
                <li key={t.label}>{t.why}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
