import { Fragment } from "react";
import Script from "next/script";
import { locality } from "@/lib/aisearch";
import { ChatButton, CopyButton, Gallery, LeadForm, PriceList, SafeImg, SiteMotion } from "./site-client";
import { Hero3D } from "./hero-3d";
import { pickScene, SCENE_KEYS } from "@/lib/scene-pick";
import { fontsHref, themeFor, wordsFor } from "./themes";
import styles from "./site.module.css";
/**
 * The redesigned website: a new identity (theme, fonts, layout, motion) and more pages,
 * built only from the business's own facts. Nothing is invented; sections without real content are left out.
 * The home page carries every fact on its own (it is what gets measured); the inner pages go deeper.
 */
const digits = (s) => s.replace(/\D/g, "");
const telOf = (p) => {
  const d = digits(p);
  return d.length === 10 ? `+91${d}` : `+${d}`;
};
const prettyPhone = (p) => {
  const d = digits(p);
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  return p;
};
const GENERIC_HEADLINE = /^(welcome|home|hello|hi|about us|homepage)\b/i;
const SKIP_SECTION =
  /about|faq|question|contact|testimonial|review|price|menu|hours|timing|visit|location|follow|gallery|blog|newsletter|subscribe|book|appointment|call us|©/i;
const priceNum = (p) => Number(p.replace(/,/g, "").match(/\d+(\.\d+)?/)?.[0] ?? 0);
/** First one or two sentences, never cut mid-word. */
function lede(s, max = 240) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > 60 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
}
/** Everything the pages need, worked out once from the business's facts. */
export function siteModel(k, search, brand) {
  const c = k.content;
  const w = wordsFor(k.businessType);
  const where = k.address ? locality(k.address) : "";
  const wa = k.whatsapp.find((x) => digits(x).length >= 10);
  const phone = k.phones[0] ?? wa;
  const headline = c?.headline && !GENERIC_HEADLINE.test(c.headline) && c.headline.length >= 6 && c.headline.length <= 110 ? c.headline : k.name;
  const intro = lede(c?.subheadline || k.description || c?.about[0] || "");
  const services = k.prices.length ? k.prices.map((p) => p.name) : k.services;
  const highlights = (c?.sections ?? [])
    .filter((s) => !SKIP_SECTION.test(s.heading) && !/whatsapp|\d{5}\s?\d{5}|prices? include|gst/i.test(s.text) && s.heading !== headline && s.text !== intro)
    .slice(0, 6);
  const priced = k.prices.filter((p) => priceNum(p.price) > 0);
  const cheapest = [...priced].sort((a, b) => priceNum(a.price) - priceNum(b.price))[0];
  const about = (c?.about ?? []).filter((p) => p !== intro);
  const testimonials = c?.testimonials ?? [];
  const faqs = search.faqs;
  const photos = [brand.hero, ...brand.gallery].filter(Boolean).filter((p, i, a) => a.findIndex((x) => x.src === p.src) === i);
  const mapQuery = k.address ? `${k.name} ${k.address}` : "";
  const mapHref = k.mapUrl || (mapQuery ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}` : "");
  const hasOffer = k.prices.length > 0 || highlights.length > 0 || services.length >= 3;
  const pages = [
    { slug: "", label: "Home" },
    hasOffer && { slug: "services", label: w.offer },
    (about.length > 0 || highlights.length > 0) && { slug: "about", label: "About" },
    photos.length >= 3 && { slug: "gallery", label: "Gallery" },
    faqs.length > 0 && { slug: "faq", label: "FAQ" },
    { slug: "contact", label: "Contact" },
  ].filter(Boolean);
  return { c, w, where, wa, phone, headline, intro, services, highlights, cheapest, about, testimonials, faqs, photos, mapQuery, mapHref, hasOffer, pages };
}
export const PAGE_SLUGS = ["services", "about", "gallery", "faq", "contact"];
export function SiteView({ k, search, brand, agentId, preview, page = "", base, scene }) {
  const m = siteModel(k, search, brand);
  const t = themeFor(k.businessType);
  const href = (slug) => (slug ? `${base}/${slug}` : base || "/");
  const vars = {
    ["--bg"]: t.bg,
    ["--surface"]: t.surface,
    ["--ink"]: t.ink,
    ["--muted"]: t.muted,
    ["--line"]: t.line,
    ["--a"]: t.accent,
    ["--a-ink"]: t.accentInk,
    ["--dark"]: t.dark,
    ["--dark-ink"]: t.darkInk,
    ["--site-display"]: `"${t.display}"`,
    ["--site-body"]: `"${t.body}"`,
    ["--r"]: t.radius,
    ["--track"]: t.tracking,
    ["--case"]: t.upper ? "uppercase" : "none",
  };
  const sceneKey = SCENE_KEYS.includes(scene) ? scene : pickScene(k).key;
  const ctx = { k, m, t, brand, search, agentId, preview, href, sceneKey };
  return (
    <div className={styles.site} data-fs-site data-theme={t.name.toLowerCase()} data-page={page || "home"} style={vars}>
      <link rel="stylesheet" precedence="default" href={fontsHref(t)} />
      <style>{`@view-transition{navigation:auto}::view-transition-old(root){animation:.35s cubic-bezier(.22,1,.36,1) both wbSiteOut}::view-transition-new(root){animation:.55s cubic-bezier(.22,1,.36,1) both wbSiteIn}@keyframes wbSiteOut{to{opacity:0;transform:translateY(-12px)}}@keyframes wbSiteIn{from{opacity:0;transform:translateY(18px)}}html:has([data-fs-site]){scrollbar-color:${t.accent} ${t.bg};scrollbar-width:thin}html:has([data-fs-site])::-webkit-scrollbar{width:10px}html:has([data-fs-site])::-webkit-scrollbar-track{background:${t.bg}}html:has([data-fs-site])::-webkit-scrollbar-thumb{background:${t.accent};border-radius:10px;border:2px solid ${t.bg}}`}</style>
      {!page &&
        search.jsonLd.map((ld, i) => <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />)}
      {preview && (
        <p className={styles.draftBar} role="note">
          Preview of the redesigned website. Every detail comes from {new URL(k.url).hostname}.
        </p>
      )}
      {!page && (
        <div className={styles.curtain} data-site-curtain aria-hidden="true">
          <span>{k.name}</span>
        </div>
      )}
      <Header {...ctx} page={page} />
      <main id="main" className={styles.main}>
        {page === "" && <Home {...ctx} />}
        {page === "services" && <ServicesPage {...ctx} />}
        {page === "about" && <AboutPage {...ctx} />}
        {page === "gallery" && <GalleryPage {...ctx} />}
        {page === "faq" && <FaqPage {...ctx} />}
        {page === "contact" && <ContactPage {...ctx} />}
      </main>
      <Footer {...ctx} />
      <div className={styles.mobileBar} role="group" aria-label="Quick contact">
        {m.phone && <a href={`tel:${telOf(m.phone)}`}>Call</a>}
        {m.wa && (
          <a href={`https://wa.me/${digits(m.wa)}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        )}
        <a href={`${href("contact")}#book`} data-primary>
          {m.w.ctaShort}
        </a>
      </div>
      <SiteMotion />
      {agentId && !preview && <Script src="/widget.js" data-agent={agentId} data-color={t.accent} data-label="Ask us anything" strategy="afterInteractive" />}
    </div>
  );
}
/* -------------------------------------------------------------- chrome */
function Brand({ k, brand, href }) {
  return (
    <a href={href("")} className={styles.brand} aria-label={`${k.name}, home`}>
      {brand.logo ? (
        <SafeImg
          src={brand.logo}
          alt=""
          className={styles.logo}
          fallback={
            <span className={styles.mark} aria-hidden="true">
              {k.name.slice(0, 1)}
            </span>
          }
        />
      ) : (
        <span className={styles.mark} aria-hidden="true">
          {k.name.slice(0, 1)}
        </span>
      )}
      <span className={brand.logo ? styles.srOnly : styles.brandName}>{k.name}</span>
    </a>
  );
}
function Header({ k, m, brand, href, page }) {
  return (
    <header className={styles.header} data-site-header data-over={page === "" && brand.hero ? "photo" : undefined}>
      <span className={styles.progress} data-site-progress aria-hidden="true" />
      <div className={styles.inner}>
        <Brand k={k} brand={brand} href={href} />
        <nav className={styles.tabs} aria-label="Pages">
          {m.pages.filter((p) => p.slug).map((p) => (
            <a key={p.slug} href={href(p.slug)} aria-current={p.slug === page ? "page" : undefined}>
              {p.label}
            </a>
          ))}
        </nav>
        <div className={styles.headCtas}>
          {m.phone && (
            <a className={styles.headCall} href={`tel:${telOf(m.phone)}`} aria-label={`Call ${prettyPhone(m.phone)}`}>
              {prettyPhone(m.phone)}
            </a>
          )}
          <a className={styles.btn} href={`${href("contact")}#book`}>
            {m.w.ctaShort}
          </a>
        </div>
      </div>
      <details className={styles.burger}>
        <summary aria-label="Menu">
          <i />
          <i />
        </summary>
        <nav aria-label="Pages (mobile)">
          {m.pages.filter((p) => p.slug).map((p) => (
            <a key={p.slug} href={href(p.slug)} aria-current={p.slug === page ? "page" : undefined}>
              {p.label}
            </a>
          ))}
        </nav>
      </details>
    </header>
  );
}
function Footer({ k, m, href }) {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.footTop}>
          <div>
            <p className={styles.footName}>{k.name}</p>
            {m.intro && <p className={styles.footLede}>{lede(m.intro, 150)}</p>}
          </div>
          <div className={styles.footCol}>
            <span>Pages</span>
            {m.pages.map((p) => (
              <a key={p.slug} href={href(p.slug)}>
                {p.label}
              </a>
            ))}
          </div>
          <div className={styles.footCol}>
            <span>Visit</span>
            {k.address && <address className={styles.addr}>{k.address}</address>}
            {k.hours.slice(0, 3).map((h) => (
              <p key={h}>{h}</p>
            ))}
          </div>
          <div className={styles.footCol}>
            <span>Contact</span>
            {k.phones.slice(0, 2).map((p) => (
              <a key={p} href={`tel:${telOf(p)}`}>
                {prettyPhone(p)}
              </a>
            ))}
            {m.wa && (
              <a href={`https://wa.me/${digits(m.wa)}`} target="_blank" rel="noreferrer">
                WhatsApp
              </a>
            )}
            {k.emails.slice(0, 2).map((e) => (
              <a key={e} href={`mailto:${e}`}>
                {e}
              </a>
            ))}
            {k.socialLinks.map((s) => (
              <a key={s.url} href={s.url} target="_blank" rel="noreferrer">
                {s.name}
              </a>
            ))}
          </div>
        </div>
        <div className={styles.footBottom}>
          <span>
            © {new Date().getFullYear()} {k.name}
          </span>
          <span className={styles.made}>Redesigned with Weblyy{k.url.includes("kesar-beauty.demo") ? " · demo business, fictional" : ""}</span>
        </div>
      </div>
    </footer>
  );
}
/* -------------------------------------------------------------- blocks */
function PageHero({ eyebrow, title, text, brand, dark }) {
  return (
    <section className={styles.pageHero} data-dark={dark ? "" : undefined}>
      {brand?.hero && (
        <div className={styles.pageHeroMedia} aria-hidden="true">
          <SafeImg src={brand.hero.src} alt="" />
        </div>
      )}
      <div className={styles.inner}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1 className={styles.display}>
          <Words text={title} />
        </h1>
        {text && <p className={styles.pageLede}>{text}</p>}
      </div>
    </section>
  );
}
/** A headline that rises in word by word. */
function Words({ text, delay = 0 }) {
  const words = text.split(" ");
  return words.map((word, i) => (
    <Fragment key={`${word}-${i}`}>
      <span className={styles.word}>
        <span style={{ ["--d"]: `${delay + i * 70}ms` }}>{word}</span>
      </span>
      {i < words.length - 1 ? " " : null}
    </Fragment>
  ));
}
function SectionHead({ no, eyebrow, title, action }) {
  return (
    <div className={styles.head} data-reveal>
      <p className={styles.eyebrow}>
        {no && <span className={styles.no}>{no}</span>}
        {eyebrow}
      </p>
      <h2 className={styles.display}>{title}</h2>
      {action}
    </div>
  );
}
function Stats({ k, m, brand }) {
  const items = [
    k.prices.length > 0 && { n: String(k.prices.length), count: k.prices.length, l: `${m.w.offer.toLowerCase()} with clear prices` },
    m.cheapest && { n: m.cheapest.price, l: `starting price (${m.cheapest.name})` },
    brand.rating && { n: `${brand.rating.value}★`, count: brand.rating.value, after: "★", l: `on ${brand.rating.platform}${brand.rating.count ? `, ${brand.rating.count} reviews` : ""}` },
    k.hours[0] && { n: "Open", l: k.hours[0] },
  ]
    .filter(Boolean)
    .slice(0, 4);
  if (items.length < 2) return null;
  return (
    <section className={styles.stats} aria-label="At a glance">
      <div className={styles.inner}>
        {items.map((s, i) => (
          <div key={s.l} data-reveal style={{ ["--d"]: `${i * 90}ms` }}>
            <b>
              {s.count !== undefined ? (
                <>
                  <span data-count={String(s.count)}>{String(s.count)}</span>
                  {s.after}
                </>
              ) : (
                s.n
              )}
            </b>
            <span>{s.l}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
/** Floating glass panel beside the hero headline: the facts a visitor looks for first. */
function Glance({ k, m, brand }) {
  const rows = [
    k.hours[0] && { l: "Open", v: k.hours[0] },
    m.cheapest && { l: "Prices from", v: m.cheapest.price, s: m.cheapest.name },
    brand.rating && { l: "Rated", v: `${brand.rating.value}★`, s: `on ${brand.rating.platform}${brand.rating.count ? ` · ${brand.rating.count} reviews` : ""}` },
    m.where && { l: "Where", v: m.where },
  ].filter(Boolean);
  if (rows.length < 2) return null;
  return (
    <aside className={`${styles.glance} ${styles.rise}`} style={{ ["--d"]: "1200ms" }} aria-label="At a glance">
      <p className={styles.glanceHead}>
        <span className={styles.live} aria-hidden="true" /> At a glance
      </p>
      <dl>
        {rows.slice(0, 4).map((r) => (
          <div key={r.l}>
            <dt>{r.l}</dt>
            <dd>
              {r.v}
              {r.s && <small>{r.s}</small>}
            </dd>
          </div>
        ))}
      </dl>
      {m.phone && (
        <a className={styles.glanceCall} href={`tel:${telOf(m.phone)}`}>
          Call {prettyPhone(m.phone)} →
        </a>
      )}
    </aside>
  );
}
function Marquee({ items }) {
  if (items.length < 4) return null;
  const row = items.slice(0, 14);
  return (
    <div className={styles.marquee} aria-hidden="true">
      <div>
        {[...row, ...row].map((s, i) => (
          <span key={i}>
            {s}
            <i>✦</i>
          </span>
        ))}
      </div>
    </div>
  );
}
function Quotes({ m }) {
  if (!m.testimonials.length) return null;
  return (
    <section className={styles.section} aria-labelledby="reviews-h">
      <div className={styles.inner}>
        <div className={styles.head} data-reveal>
          <p className={styles.eyebrow}>{m.w.reviews}</p>
          <h2 id="reviews-h" className={styles.display}>
            In their words
          </h2>
        </div>
        <ul className={styles.quotes}>
          {m.testimonials.slice(0, 6).map((q, i) => (
            <li key={q.quote.slice(0, 40)} data-reveal style={{ ["--d"]: `${i * 90}ms` }}>
              <span className={styles.qMark} aria-hidden="true">
                &ldquo;
              </span>
              <blockquote>
                <p>{q.quote}</p>
              </blockquote>
              {q.author && <cite>{q.author}</cite>}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
function Faqs({ m, limit }) {
  const list = limit ? m.faqs.slice(0, limit) : m.faqs;
  return (
    <div className={styles.faqs}>
      {list.map((f, i) => (
        <details key={f.q} data-reveal style={{ ["--d"]: `${Math.min(i, 6) * 50}ms` }}>
          <summary>
            <span className={styles.faqNo}>{String(i + 1).padStart(2, "0")}</span>
            {f.q}
            <i aria-hidden="true" />
          </summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}
function ContactBlock({ k, m, agentId, preview }) {
  return (
    <div className={styles.contactGrid}>
      <div className={styles.contactInfo} data-reveal>
        <dl className={styles.dl}>
          {k.address && (
            <div>
              <dt>Address</dt>
              <dd>
                <address className={styles.addr}>{k.address}</address>
                <CopyButton text={k.address} label="Address" />
              </dd>
            </div>
          )}
          {k.hours.length > 0 && (
            <div>
              <dt>Hours</dt>
              <dd>
                {k.hours.map((h) => (
                  <span key={h} className={styles.line}>
                    {h}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {k.phones.slice(0, 2).map((p) => (
            <div key={p}>
              <dt>Phone</dt>
              <dd>
                <a href={`tel:${telOf(p)}`}>{prettyPhone(p)}</a>
                <CopyButton text={prettyPhone(p)} label="Phone number" />
              </dd>
            </div>
          ))}
          {m.wa && (
            <div>
              <dt>WhatsApp</dt>
              <dd>
                <a href={`https://wa.me/${digits(m.wa)}`} target="_blank" rel="noreferrer">
                  {prettyPhone(m.wa)}
                </a>
              </dd>
            </div>
          )}
          {k.emails.slice(0, 2).map((e) => (
            <div key={e}>
              <dt>Email</dt>
              <dd>
                <a href={`mailto:${e}`}>{e}</a>
                <CopyButton text={e} label="Email" />
              </dd>
            </div>
          ))}
        </dl>
        <div className={styles.row}>
          {m.mapHref && (
            <a className={styles.btnGhost} href={m.mapHref} target="_blank" rel="noreferrer">
              Get directions ↗
            </a>
          )}
          <ChatButton className={styles.btnGhost} preview={preview}>
            Ask a question
          </ChatButton>
        </div>
      </div>
      <div id="book" className={styles.formCard} data-reveal style={{ ["--d"]: "120ms" }}>
        <p className={styles.eyebrow}>{m.w.ctaShort}</p>
        <h3 className={styles.display}>{m.w.cta}</h3>
        <p className={styles.small}>Leave your details and we&apos;ll get back to you.</p>
        <LeadForm agentId={agentId} services={m.services} cta={m.w.cta} />
      </div>
    </div>
  );
}
function CtaBand({ k, m, href }) {
  return (
    <section className={styles.ctaBand} aria-label={m.w.cta}>
      <div className={styles.inner} data-reveal>
        <p className={styles.eyebrow}>{m.w.mood}</p>
        <h2 className={styles.display}>
          {m.w.cta} at <em>{k.name}</em>
        </h2>
        <div className={styles.row}>
          <a className={styles.btn} href={`${href("contact")}#book`}>
            {m.w.cta} →
          </a>
          {m.wa ? (
            <a className={styles.btnLight} href={`https://wa.me/${digits(m.wa)}`} target="_blank" rel="noreferrer">
              WhatsApp us
            </a>
          ) : (
            m.phone && (
              <a className={styles.btnLight} href={`tel:${telOf(m.phone)}`}>
                Call {prettyPhone(m.phone)}
              </a>
            )
          )}
        </div>
      </div>
    </section>
  );
}
/* -------------------------------------------------------------- pages */
function Home(p) {
  const { k, m, brand, href, preview } = p;
  const signature = k.prices.slice(0, 6);
  return (
    <>
      <section className={styles.hero} data-photo={brand.hero ? "" : undefined} aria-labelledby="hero-h">
        {brand.hero && (
          <div className={styles.heroMedia} aria-hidden="true">
            <SafeImg src={brand.hero.src} alt="" priority />
          </div>
        )}
        <div className={styles.heroShade} aria-hidden="true" />
        <div className={styles.hero3d}>
          <Hero3D color={p.t.accent} glow={p.t.darkInk} photo={Boolean(brand.hero)} scene={p.sceneKey} />
        </div>
        <div className={`${styles.inner} ${styles.heroGrid}`}>
        <div className={styles.heroInner}>
          <p className={`${styles.eyebrow} ${styles.rise}`} style={{ ["--d"]: "250ms" }}>
            {m.w.kind}
            {m.where && ` · ${m.where}`}
            {brand.rating && (
              <>
                {" · "}
                <span aria-hidden="true">★</span> {brand.rating.value} on {brand.rating.platform}
              </>
            )}
          </p>
          <h1 id="hero-h" className={`${styles.display} ${styles.heroTitle}`}>
            <Words text={m.headline} delay={350} />
          </h1>
          {m.intro && (
            <p className={`${styles.heroLede} ${styles.rise}`} style={{ ["--d"]: "900ms" }}>
              {m.intro}
            </p>
          )}
          <div className={`${styles.row} ${styles.rise}`} style={{ ["--d"]: "1050ms" }}>
            <a className={styles.btn} href={`${href("contact")}#book`} data-magnetic>
              {m.w.cta} →
            </a>
            {m.wa ? (
              <a className={styles.btnLight} href={`https://wa.me/${digits(m.wa)}`} target="_blank" rel="noreferrer">
                WhatsApp us
              </a>
            ) : (
              m.phone && (
                <a className={styles.btnLight} href={`tel:${telOf(m.phone)}`}>
                  Call {prettyPhone(m.phone)}
                </a>
              )
            )}
          </div>
          <ChatButton className={`${styles.heroAsk} ${styles.rise}`} preview={preview}>
            <span className={styles.pulse} aria-hidden="true" /> Ask anything and get an instant answer
          </ChatButton>
        </div>
        <Glance {...p} />
        </div>
        <a className={styles.scrollCue} href="#home-offer" aria-label="Scroll to see more">
          <span />
        </a>
      </section>
      <Marquee items={m.services} />
      <Stats {...p} />
      {m.hasOffer && (
        <section id="home-offer" className={styles.section} aria-labelledby="offer-h">
          <div className={styles.inner}>
            <SectionHead
              no="01"
              eyebrow={m.w.offer}
              title={<span id="offer-h">{m.w.offerTitle}</span>}
              action={
                <a className={styles.link} href={href("services")}>
                  {k.prices.length > signature.length ? `All ${k.prices.length} ${m.w.offer.toLowerCase()}` : `Explore ${m.w.offer.toLowerCase()}`} →
                </a>
              }
            />
            {signature.length > 0 ? (
              <ul className={styles.signature}>
                {signature.map((s, i) => (
                  <li key={s.name} data-reveal style={{ ["--d"]: `${(i % 3) * 90}ms` }}>
                    <span className={styles.sigNo}>{String(i + 1).padStart(2, "0")}</span>
                    <h3>{s.name}</h3>
                    <b>{s.price}</b>
                  </li>
                ))}
              </ul>
            ) : (
              <ul className={styles.chips}>
                {m.services.slice(0, 16).map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            {k.prices.length > signature.length && (
              <details className={styles.more}>
                <summary>See the full list of {k.prices.length}</summary>
                <PriceList items={k.prices.slice(signature.length)} word={m.w.offer} />
              </details>
            )}
          </div>
        </section>
      )}
      {(m.about.length > 0 || m.highlights.length > 0) && (
        <section className={`${styles.section} ${styles.darkBand}`} aria-labelledby="story-h">
          <div className={`${styles.inner} ${styles.story}`} data-media={brand.gallery[0] ? "yes" : "no"}>
            <div>
              <SectionHead no="02" eyebrow={m.w.story} title={<span id="story-h">About {k.name}</span>} />
              <div className={styles.prose} data-reveal>
                {(m.about.length ? m.about : m.highlights.map((h) => h.text)).slice(0, 3).map((t) => (
                  <p key={t.slice(0, 40)}>{t}</p>
                ))}
              </div>
              <a className={styles.linkLight} href={href("about")}>
                Read our story →
              </a>
            </div>
            {brand.gallery[0] && (
              <figure className={styles.storyMedia} data-reveal>
                <SafeImg src={brand.gallery[0].src} alt={brand.gallery[0].alt || `Inside ${k.name}`} />
              </figure>
            )}
          </div>
        </section>
      )}
      {m.highlights.length > 0 && m.about.length > 0 && (
        <section className={styles.section} aria-label="Highlights">
          <div className={styles.inner}>
            <ul className={styles.cards}>
              {m.highlights.map((h, i) => (
                <li key={h.heading} data-reveal style={{ ["--d"]: `${(i % 3) * 90}ms` }}>
                  <span className={styles.sigNo}>{String(i + 1).padStart(2, "0")}</span>
                  <h3>{h.heading}</h3>
                  <p>{h.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <Quotes m={m} />
      {m.photos.length >= 3 && (
        <section className={styles.section} aria-labelledby="photos-h">
          <div className={styles.inner}>
            <SectionHead
              no="03"
              eyebrow="Gallery"
              title={<span id="photos-h">A look inside</span>}
              action={
                <a className={styles.link} href={href("gallery")}>
                  All photos →
                </a>
              }
            />
            <Gallery photos={m.photos.slice(0, 6)} name={k.name} />
          </div>
        </section>
      )}
      {m.faqs.length > 0 && (
        <section className={`${styles.section} ${styles.tint}`} aria-labelledby="faq-h">
          <div className={`${styles.inner} ${styles.faqGrid}`}>
            <SectionHead
              no="04"
              eyebrow="Good to know"
              title={<span id="faq-h">Questions, answered</span>}
              action={
                m.faqs.length > 5 && (
                  <a className={styles.link} href={href("faq")}>
                    All {m.faqs.length} questions →
                  </a>
                )
              }
            />
            <Faqs m={m} limit={8} />
          </div>
        </section>
      )}
      <section className={styles.section} aria-labelledby="contact-h">
        <div className={styles.inner}>
          <SectionHead no="05" eyebrow="Visit & contact" title={<span id="contact-h">{k.address ? `Visit ${k.name}` : "Get in touch"}</span>} />
          <ContactBlock {...p} />
        </div>
      </section>
      <CtaBand {...p} />
    </>
  );
}
function ServicesPage(p) {
  const { k, m, brand } = p;
  return (
    <>
      <PageHero
        eyebrow={m.w.offer}
        title={m.w.offerTitle}
        text={k.prices.length ? `${k.prices.length} ${m.w.offer.toLowerCase()}, every price upfront.` : `Everything ${k.name} offers.`}
        brand={brand}
      />
      <section className={styles.section}>
        <div className={styles.inner}>
          {k.prices.length > 0 ? (
            <PriceList items={k.prices} word={m.w.offer} />
          ) : (
            <ul className={styles.chips}>
              {m.services.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {m.highlights.length > 0 && (
            <ul className={`${styles.cards} ${styles.spaced}`}>
              {m.highlights.map((h, i) => (
                <li key={h.heading} data-reveal style={{ ["--d"]: `${(i % 3) * 90}ms` }}>
                  <span className={styles.sigNo}>{String(i + 1).padStart(2, "0")}</span>
                  <h3>{h.heading}</h3>
                  <p>{h.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
      <CtaBand {...p} />
    </>
  );
}
function AboutPage(p) {
  const { k, m, brand } = p;
  const paras = m.about.length ? m.about : m.highlights.map((h) => h.text);
  return (
    <>
      <PageHero eyebrow={m.w.story} title={`About ${k.name}`} text={m.intro} brand={brand} />
      <section className={styles.section}>
        <div className={`${styles.inner} ${styles.story}`} data-media={brand.gallery[0] ? "yes" : "no"}>
          <div className={`${styles.prose} ${styles.proseLarge}`} data-reveal>
            {paras.map((t) => (
              <p key={t.slice(0, 40)}>{t}</p>
            ))}
          </div>
          {brand.gallery[0] && (
            <figure className={styles.storyMedia} data-reveal>
              <SafeImg src={brand.gallery[0].src} alt={brand.gallery[0].alt || `Inside ${k.name}`} />
            </figure>
          )}
        </div>
      </section>
      <Stats {...p} />
      {m.highlights.length > 0 && m.about.length > 0 && (
        <section className={styles.section}>
          <div className={styles.inner}>
            <ul className={styles.cards}>
              {m.highlights.map((h, i) => (
                <li key={h.heading} data-reveal style={{ ["--d"]: `${(i % 3) * 90}ms` }}>
                  <span className={styles.sigNo}>{String(i + 1).padStart(2, "0")}</span>
                  <h3>{h.heading}</h3>
                  <p>{h.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
      <Quotes m={m} />
      <CtaBand {...p} />
    </>
  );
}
function GalleryPage(p) {
  const { k, m, brand } = p;
  return (
    <>
      <PageHero eyebrow="Gallery" title="A look inside" text={`${m.photos.length} photos from ${k.name}.`} brand={brand} />
      <section className={styles.section}>
        <div className={styles.inner}>
          <Gallery photos={m.photos} name={k.name} />
        </div>
      </section>
      <CtaBand {...p} />
    </>
  );
}
function FaqPage(p) {
  const { m } = p;
  return (
    <>
      <PageHero eyebrow="Good to know" title="Questions, answered" text={`${m.faqs.length} answers to what ${m.w.people} ask most.`} />
      <section className={styles.section}>
        <div className={`${styles.inner} ${styles.narrow}`}>
          <Faqs m={m} />
        </div>
      </section>
      <CtaBand {...p} />
    </>
  );
}
function ContactPage(p) {
  const { k, m } = p;
  return (
    <>
      <PageHero eyebrow="Visit & contact" title={k.address ? `Visit ${k.name}` : "Get in touch"} text={m.where ? `Find us in ${m.where}.` : ""} />
      <section className={styles.section}>
        <div className={styles.inner}>
          <ContactBlock {...p} />
          {m.mapQuery && (
            <div className={styles.map} data-reveal>
              <iframe
                title={`Map to ${k.name}`}
                src={`https://maps.google.com/maps?q=${encodeURIComponent(m.mapQuery)}&z=15&output=embed`}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
