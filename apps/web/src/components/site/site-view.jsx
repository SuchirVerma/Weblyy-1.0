import Script from "next/script";
import { locality } from "@/lib/aisearch";
import { SYSTEM_SERIFS } from "@/lib/makeover";
import { ChatButton, LeadForm, SafeImg } from "./site-client";
import styles from "./site.module.css";
/**
 * The redesigned website. Every word, number and photo on it comes from the business's own site
 * (or from facts found there, such as the address). Sections without real content are left out.
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
const fontParam = (f) => f.replace(/ /g, "+");
/** First one or two sentences, never cut mid-word. */
function lede(s, max = 240) {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const end = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return end > 60 ? cut.slice(0, end + 1) : `${cut.replace(/\s+\S*$/, "")}…`;
}
const CTA_LABEL = {
  salon: "Request an appointment",
  clinic: "Request an appointment",
  fitness: "Request a trial session",
  education: "Request a call back",
  restaurant: "Send an enquiry",
  retail: "Send an enquiry",
  services: "Request a call back",
};
const CTA_SHORT = {
  salon: "Book",
  clinic: "Book",
  fitness: "Try a session",
  education: "Call back",
  restaurant: "Enquire",
  retail: "Enquire",
  services: "Call back",
};
export function SiteView({ k, search, brand, agentId, preview }) {
  const c = k.content;
  const where = k.address ? locality(k.address) : "";
  const wa = k.whatsapp.find((w) => digits(w).length >= 10);
  const phone = k.phones[0] ?? wa;
  const headline = c?.headline && !GENERIC_HEADLINE.test(c.headline) && c.headline.length >= 6 && c.headline.length <= 110 ? c.headline : k.name;
  const intro = lede(c?.subheadline || k.description || c?.about[0] || "");
  const cta = CTA_LABEL[k.businessType];
  const services = k.prices.length ? k.prices.map((p) => p.name) : k.services;
  const highlights = (c?.sections ?? [])
    .filter((s) => !SKIP_SECTION.test(s.heading) && !/whatsapp|\d{5}\s?\d{5}|prices? include|gst/i.test(s.text) && s.heading !== headline && s.text !== intro)
    .slice(0, 6);
  const cheapest = [...k.prices].sort((a, b) => priceNum(a.price) - priceNum(b.price)).find((p) => priceNum(p.price) > 0);
  const about = (c?.about ?? []).filter((p) => p !== intro);
  const testimonials = c?.testimonials ?? [];
  const faqs = search.faqs.slice(0, 8);
  const mapHref = k.mapUrl || (k.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${k.name} ${k.address}`)}` : "");
  const hasOffer = k.prices.length > 0 || highlights.length > 0 || services.length >= 3;
  const nav = [
    hasOffer && { href: "#offer", label: k.prices.length ? "Services & prices" : "What we do" },
    about.length > 0 && { href: "#about", label: "About" },
    testimonials.length > 0 && { href: "#reviews", label: "Reviews" },
    faqs.length > 0 && { href: "#faq", label: "FAQ" },
    { href: "#contact", label: "Contact" },
  ].filter(Boolean);
  const fonts = [brand.headingFont, brand.bodyFont].filter((f, i, a) => f && a.indexOf(f) === i && !SYSTEM_SERIFS.has(f));
  const vars = {
    ["--a"]: brand.accent,
    ...(brand.headingFont && { ["--site-display"]: `"${brand.headingFont}"` }),
    ...(brand.bodyFont && { ["--site-body"]: `"${brand.bodyFont}"` }),
  };
  return (
    <div className={styles.site} data-fs-site style={vars}>
      {fonts.length > 0 && (
        <link
          rel="stylesheet"
          precedence="default"
          href={`https://fonts.googleapis.com/css2?${fonts.map((f) => `family=${fontParam(f)}:wght@400;600;700`).join("&")}&display=swap`}
        />
      )}
      {search.jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      ))}

      {preview && (
        <p className={styles.draftBar} role="note">
          Preview of the redesigned website. Every detail comes from {new URL(k.url).hostname}.
        </p>
      )}

      <header className={styles.top}>
        <div className={styles.inner}>
          <a href="#main" className={styles.brand} aria-label={`${k.name}, back to top`}>
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
            <span className={styles.brandName}>{k.name}</span>
          </a>
          <nav className={styles.links} aria-label="Sections">
            {nav.map((l) => (
              <a key={l.href} href={l.href}>
                {l.label}
              </a>
            ))}
          </nav>
          <div className={styles.topCtas}>
            {phone && (
              <a className={styles.ghost} href={`tel:${telOf(phone)}`} aria-label={`Call ${prettyPhone(phone)}`}>
                Call
              </a>
            )}
            <a className={styles.primary} href="#contact">
              {CTA_SHORT[k.businessType]}
            </a>
          </div>
        </div>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-h">
          <div className={`${styles.inner} ${styles.heroGrid}`} data-media={brand.hero || k.hours[0] || where || cheapest ? "yes" : "no"}>
            <div className={styles.heroCopy}>
              {(where || brand.rating) && (
                <p className={styles.eyebrow}>
                  {where}
                  {where && brand.rating && <span aria-hidden="true"> · </span>}
                  {brand.rating && (
                    <span>
                      <span aria-hidden="true">★</span> {brand.rating.value} on {brand.rating.platform}
                      {brand.rating.count ? ` (${brand.rating.count} reviews)` : ""}
                    </span>
                  )}
                </p>
              )}
              <h1 id="hero-h">{headline}</h1>
              {intro && <p className={styles.lede}>{intro}</p>}
              <div className={styles.ctas}>
                <a className={styles.primary} href="#contact">
                  {cta}
                </a>
                {wa ? (
                  <a className={styles.wa} href={`https://wa.me/${digits(wa)}`} target="_blank" rel="noreferrer">
                    WhatsApp us
                  </a>
                ) : (
                  phone && (
                    <a className={styles.ghost} href={`tel:${telOf(phone)}`}>
                      Call {prettyPhone(phone)}
                    </a>
                  )
                )}
              </div>
              <ChatButton className={styles.textLink} preview={preview}>
                Or ask a question and get an instant answer →
              </ChatButton>
              {brand.hero && (k.hours[0] || phone) && (
                <dl className={styles.facts}>
                  {k.hours[0] && (
                    <div>
                      <dt>Open</dt>
                      <dd>{k.hours[0]}</dd>
                    </div>
                  )}
                  {phone && (
                    <div>
                      <dt>Phone</dt>
                      <dd>
                        <a href={`tel:${telOf(phone)}`}>{prettyPhone(phone)}</a>
                      </dd>
                    </div>
                  )}
                </dl>
              )}
            </div>
            {!brand.hero && (k.hours[0] || where || cheapest) && (
              <aside className={styles.heroCard} aria-label="At a glance">
                <p className={styles.eyebrow}>At a glance</p>
                <dl>
                  {k.hours[0] && (
                    <div>
                      <dt>Open</dt>
                      <dd>{k.hours[0]}</dd>
                    </div>
                  )}
                  {cheapest && (
                    <div>
                      <dt>Prices from</dt>
                      <dd>
                        {cheapest.price} <small>({cheapest.name})</small>
                      </dd>
                    </div>
                  )}
                  {where && (
                    <div>
                      <dt>Where</dt>
                      <dd>{where}</dd>
                    </div>
                  )}
                  {phone && (
                    <div>
                      <dt>Call</dt>
                      <dd>
                        <a href={`tel:${telOf(phone)}`}>{prettyPhone(phone)}</a>
                      </dd>
                    </div>
                  )}
                </dl>
                {k.prices.length > 0 && (
                  <a className={styles.textLink} href="#offer">
                    See all {k.prices.length} services and prices →
                  </a>
                )}
              </aside>
            )}
            {brand.hero && (
              <figure className={styles.heroMedia} data-wide={brand.hero.wide ? "yes" : undefined}>
                <SafeImg src={brand.hero.src} alt={brand.hero.alt || k.name} priority />
              </figure>
            )}
          </div>
        </section>

        {hasOffer && (
          <section id="offer" className={styles.section} aria-labelledby="offer-h">
            <div className={styles.inner}>
              <p className={styles.eyebrow}>{k.prices.length ? "Services & prices" : "What we do"}</p>
              <h2 id="offer-h">{k.prices.length ? "Services and prices" : `What ${k.name} offers`}</h2>
              {k.prices.length > 0 ? (
                <>
                  <ul className={styles.menu}>
                    {k.prices.slice(0, 12).map((p) => (
                      <li key={p.name}>
                        <span>{p.name}</span>
                        <i aria-hidden="true" />
                        <b>{p.price}</b>
                      </li>
                    ))}
                  </ul>
                  {k.prices.length > 12 && (
                    <details className={styles.more}>
                      <summary>Show all {k.prices.length} services</summary>
                      <ul className={styles.menu}>
                        {k.prices.slice(12, 60).map((p) => (
                          <li key={p.name}>
                            <span>{p.name}</span>
                            <i aria-hidden="true" />
                            <b>{p.price}</b>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </>
              ) : highlights.length === 0 ? (
                <ul className={styles.chips}>
                  {services.slice(0, 16).map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              ) : null}
              {highlights.length > 0 && (
                <ul className={styles.cards}>
                  {highlights.map((h) => (
                    <li key={h.heading}>
                      <h3>{h.heading}</h3>
                      <p>{h.text}</p>
                    </li>
                  ))}
                </ul>
              )}
              <p className={styles.note}>
                Not sure what to choose? <a href="#contact">Ask us</a> and we&apos;ll help.
              </p>
            </div>
          </section>
        )}

        {about.length > 0 && (
          <section id="about" className={`${styles.section} ${styles.tint}`} aria-labelledby="about-h">
            <div className={`${styles.inner} ${styles.split}`} data-media={brand.gallery[0] ? "yes" : "no"}>
              <div>
                <p className={styles.eyebrow}>About</p>
                <h2 id="about-h">About {k.name}</h2>
                <div className={styles.prose}>
                  {about.map((p) => (
                    <p key={p.slice(0, 40)}>{p}</p>
                  ))}
                </div>
              </div>
              {brand.gallery[0] && (
                <figure className={styles.sideMedia}>
                  <SafeImg src={brand.gallery[0].src} alt={brand.gallery[0].alt || `Inside ${k.name}`} />
                </figure>
              )}
            </div>
          </section>
        )}

        {testimonials.length > 0 && (
          <section id="reviews" className={styles.section} aria-labelledby="reviews-h">
            <div className={styles.inner}>
              <p className={styles.eyebrow}>Reviews</p>
              <h2 id="reviews-h">What customers say</h2>
              <ul className={styles.quotes}>
                {testimonials.slice(0, 6).map((t) => (
                  <li key={t.quote.slice(0, 40)}>
                    <blockquote>
                      <p>{t.quote}</p>
                    </blockquote>
                    {t.author && <cite>{t.author}</cite>}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {brand.gallery.length > (about.length ? 2 : 1) && (
          <section className={styles.section} aria-label="Photos">
            <div className={styles.inner}>
              <ul className={styles.gallery}>
                {brand.gallery.slice(about.length ? 1 : 0, 7).map((g) => (
                  <li key={g.src}>
                    <SafeImg src={g.src} alt={g.alt || `${k.name} photo`} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {faqs.length > 0 && (
          <section id="faq" className={`${styles.section} ${styles.tint}`} aria-labelledby="faq-h">
            <div className={styles.inner}>
              <p className={styles.eyebrow}>Good to know</p>
              <h2 id="faq-h">Frequently asked questions</h2>
              <div className={styles.faqs}>
                {faqs.map((f) => (
                  <details key={f.q}>
                    <summary>{f.q}</summary>
                    <p>{f.a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        <section id="contact" className={styles.section} aria-labelledby="contact-h">
          <div className={`${styles.inner} ${styles.visit}`}>
            <div>
              <p className={styles.eyebrow}>Contact</p>
              <h2 id="contact-h">{k.address ? `Visit ${k.name}` : `Get in touch`}</h2>
              <dl className={styles.dl}>
                {k.address && (
                  <div>
                    <dt>Address</dt>
                    <dd>
                      <address className={styles.addr}>{k.address}</address>
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
                    </dd>
                  </div>
                ))}
                {wa && (
                  <div>
                    <dt>WhatsApp</dt>
                    <dd>
                      <a href={`https://wa.me/${digits(wa)}`} target="_blank" rel="noreferrer">
                        {prettyPhone(wa)}
                      </a>
                    </dd>
                  </div>
                )}
                {k.emails.slice(0, 2).map((e) => (
                  <div key={e}>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${e}`}>{e}</a>
                    </dd>
                  </div>
                ))}
              </dl>
              {mapHref && (
                <a className={styles.ghost} href={mapHref} target="_blank" rel="noreferrer">
                  Get directions
                </a>
              )}
            </div>

            <div className={styles.card}>
              <h3>{cta}</h3>
              <p className={styles.small}>Leave your details and we&apos;ll get back to you.</p>
              <LeadForm agentId={agentId} services={services} cta={cta} />
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <div>
            <b>{k.name}</b>
            {k.address && <span>{k.address}</span>}
          </div>
          {k.socialLinks.length > 0 && (
            <ul className={styles.social} aria-label="Social profiles">
              {k.socialLinks.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noreferrer">
                    {s.name}
                  </a>
                </li>
              ))}
            </ul>
          )}
          <span className={styles.made}>Redesigned with Weblyy{k.url.includes("kesar-beauty.demo") ? " · demo business, fictional" : ""}</span>
        </div>
      </footer>

      <div className={styles.mobileBar} role="group" aria-label="Quick contact">
        {phone && <a href={`tel:${telOf(phone)}`}>Call</a>}
        {wa && (
          <a href={`https://wa.me/${digits(wa)}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        )}
        <a href="#contact" data-primary>
          {CTA_SHORT[k.businessType]}
        </a>
      </div>

      {agentId && !preview && (
        <Script src="/widget.js" data-agent={agentId} data-color={brand.accent} data-label="Ask us anything" strategy="afterInteractive" />
      )}
    </div>
  );
}
