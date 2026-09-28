import type { Metadata } from "next";
import Link from "next/link";
import Script from "next/script";
import { buildSearchPack, locality, typeLabel } from "@/lib/aisearch";
import { getAgent } from "@/lib/store";
import type { BusinessType } from "@/lib/types";
import { ChatButton, LeadForm } from "./site-client";
import styles from "./site.module.css";

export const dynamic = "force-dynamic";

const THEME: Record<BusinessType, { accent: string; soft: string; hero: string }> = {
  salon: { accent: "#9d174d", soft: "#fdf2f8", hero: "linear-gradient(135deg,#fdf2f8 0%,#fce7f3 45%,#fff7ed 100%)" },
  clinic: { accent: "#0f766e", soft: "#f0fdfa", hero: "linear-gradient(135deg,#f0fdfa 0%,#ccfbf1 45%,#eff6ff 100%)" },
  restaurant: { accent: "#b45309", soft: "#fffbeb", hero: "linear-gradient(135deg,#fffbeb 0%,#fef3c7 45%,#fff1f2 100%)" },
  education: { accent: "#4338ca", soft: "#eef2ff", hero: "linear-gradient(135deg,#eef2ff 0%,#e0e7ff 45%,#f0f9ff 100%)" },
  fitness: { accent: "#c2410c", soft: "#fff7ed", hero: "linear-gradient(135deg,#fff7ed 0%,#ffedd5 45%,#fefce8 100%)" },
  retail: { accent: "#047857", soft: "#ecfdf5", hero: "linear-gradient(135deg,#ecfdf5 0%,#d1fae5 45%,#f0f9ff 100%)" },
  services: { accent: "#1d4ed8", soft: "#eff6ff", hero: "linear-gradient(135deg,#eff6ff 0%,#dbeafe 45%,#f5f3ff 100%)" },
};

const HEADLINES: Record<BusinessType, string> = {
  salon: "Look your best, without the wait.",
  clinic: "Gentle, expert care, close to home.",
  restaurant: "Great food, ready when you are.",
  education: "Learn from the best. Start this week.",
  fitness: "Stronger every week. Start today.",
  retail: "Everything you need, a message away.",
  services: "Quality service you can count on.",
};

async function load(id: string) {
  const agent = await getAgent(id);
  if (!agent) return null;
  const k = agent.knowledge;
  const search = agent.workspace?.search ?? buildSearchPack(k);
  return { agent, k, search };
}

export async function generateMetadata({ params }: PageProps<"/site/[id]">): Promise<Metadata> {
  const { id } = await params;
  const d = await load(id);
  if (!d) return { title: "Not found" };
  return { title: d.search.metaTitle, description: d.search.metaDescription, openGraph: { title: d.search.metaTitle, description: d.search.metaDescription } };
}

const digits = (s: string) => s.replace(/\D/g, "");
const telOf = (p: string) => {
  const d = digits(p);
  return d.length === 10 ? `+91${d}` : `+${d}`;
};

export default async function TransformedSite({ params }: PageProps<"/site/[id]">) {
  const { id } = await params;
  const d = await load(id);
  if (!d) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <p>
          This website isn&apos;t live anymore. <Link href="/">Go to Weblyy</Link>
        </p>
      </main>
    );
  }
  const { agent, k, search } = d;
  const t = THEME[k.businessType];
  const where = k.address ? locality(k.address) : "";
  const wa = k.whatsapp.find((w) => digits(w).length >= 10);
  const phone = k.phones[0] ?? wa;
  const services = k.prices.length ? k.prices.map((p) => p.name) : k.services;
  const faqs = search.faqs.slice(0, 8);
  const intro = search.summary.split(". ").slice(0, 2).join(". ").replace(/\.?$/, ".");
  const mapQuery = encodeURIComponent(`${k.name} ${k.address}`);

  return (
    <div className={styles.site} data-fs-site style={{ ["--a" as string]: t.accent, ["--soft" as string]: t.soft }}>
      {search.jsonLd.map((ld, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld).replace(/</g, "\\u003c") }} />
      ))}

      <header className={styles.top}>
        <div className={styles.inner}>
          <a href="#top" className={styles.brand}>
            <span className={styles.mark}>{k.name.slice(0, 1)}</span>
            {k.name}
          </a>
          <nav className={styles.links} aria-label="Sections">
            {services.length > 0 && <a href="#services">Services</a>}
            {faqs.length > 0 && <a href="#faq">FAQ</a>}
            <a href="#visit">Visit</a>
          </nav>
          <div className={styles.topCtas}>
            {phone && (
              <a className={styles.ghost} href={`tel:${telOf(phone)}`}>
                Call
              </a>
            )}
            <a className={styles.primary} href="#book">
              Book now
            </a>
          </div>
        </div>
      </header>

      <main id="top">
        <section className={styles.hero} style={{ background: t.hero }}>
          <div className={styles.inner}>
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>
                {typeLabel(k.businessType)}
                {where ? ` · ${where}` : ""}
              </p>
              <h1>{HEADLINES[k.businessType]}</h1>
              <p className={styles.lede}>{intro}</p>
              <div className={styles.ctas}>
                <a className={styles.primary} href="#book">
                  Book an appointment
                </a>
                <ChatButton className={styles.ghost}>Ask us anything · instant reply</ChatButton>
                {wa && (
                  <a className={styles.wa} href={`https://wa.me/${digits(wa)}`} target="_blank" rel="noreferrer">
                    WhatsApp
                  </a>
                )}
              </div>
              <ul className={styles.facts}>
                {k.hours[0] && (
                  <li>
                    <b>Open</b>
                    <span>{k.hours[0]}</span>
                  </li>
                )}
                {where && (
                  <li>
                    <b>Where</b>
                    <span>{where}</span>
                  </li>
                )}
                {k.prices.length > 0 && (
                  <li>
                    <b>Services</b>
                    <span>{k.prices.length} with prices</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </section>

        {services.length > 0 && (
          <section id="services" className={styles.section}>
            <div className={styles.inner}>
              <p className={styles.eyebrow}>Services{k.prices.length ? " & prices" : ""}</p>
              <h2>What we offer</h2>
              <ul className={styles.menu}>
                {(k.prices.length ? k.prices : services.map((s) => ({ name: s, price: "" }))).slice(0, 40).map((p) => (
                  <li key={p.name}>
                    <span>{p.name}</span>
                    <i aria-hidden="true" />
                    {p.price && <b>{p.price}</b>}
                  </li>
                ))}
              </ul>
              <p className={styles.note}>Not sure what to pick? Ask our assistant and get an answer in seconds.</p>
            </div>
          </section>
        )}

        <section className={`${styles.section} ${styles.band}`}>
          <div className={`${styles.inner} ${styles.three}`}>
            <div>
              <b>Instant answers, day and night</b>
              <p>Prices, timings and availability, answered right away by our assistant. In English or Hinglish.</p>
            </div>
            <div>
              <b>Book in a minute</b>
              <p>Tell us the service and a time that suits you. We confirm your slot personally.</p>
            </div>
            <div>
              <b>Real people when it matters</b>
              <p>Anything special or sensitive goes straight to our team, who reply personally.</p>
            </div>
          </div>
        </section>

        {faqs.length > 0 && (
          <section id="faq" className={styles.section}>
            <div className={styles.inner}>
              <p className={styles.eyebrow}>Good to know</p>
              <h2>Frequently asked questions</h2>
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

        <section id="visit" className={styles.section}>
          <div className={`${styles.inner} ${styles.visit}`}>
            <div>
              <p className={styles.eyebrow}>Visit us</p>
              <h2>Find {k.name}</h2>
              <dl className={styles.dl}>
                {k.address && (
                  <div>
                    <dt>Address</dt>
                    <dd>{k.address}</dd>
                  </div>
                )}
                {k.hours.length > 0 && (
                  <div>
                    <dt>Hours</dt>
                    <dd>{k.hours[0]}</dd>
                  </div>
                )}
                {phone && (
                  <div>
                    <dt>Phone</dt>
                    <dd>
                      <a href={`tel:${telOf(phone)}`}>{phone}</a>
                    </dd>
                  </div>
                )}
                {k.emails[0] && (
                  <div>
                    <dt>Email</dt>
                    <dd>
                      <a href={`mailto:${k.emails[0]}`}>{k.emails[0]}</a>
                    </dd>
                  </div>
                )}
              </dl>
              {k.address && (
                <a className={styles.ghost} href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`} target="_blank" rel="noreferrer">
                  Get directions
                </a>
              )}
            </div>

            <div id="book" className={styles.card}>
              <h3>Book or ask a question</h3>
              <p className={styles.small}>Leave your details and we&apos;ll call you back. Or tap the chat button for an instant answer.</p>
              <LeadForm agentId={agent.id} services={services} />
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.inner}>
          <span>
            © {k.name}
            {k.socialLinks.length > 0 && " · "}
            {k.socialLinks.map((s, i) => (
              <span key={s.url}>
                {i > 0 && " · "}
                <a href={s.url} target="_blank" rel="noreferrer">
                  {s.name}
                </a>
              </span>
            ))}
          </span>
          <span className={styles.made}>AI-ready website by Weblyy{k.url.includes("kesar-beauty.demo") ? " · demo business, fictional" : ""}</span>
        </div>
      </footer>

      <div className={styles.mobileBar}>
        {phone && <a href={`tel:${telOf(phone)}`}>Call</a>}
        {wa && (
          <a href={`https://wa.me/${digits(wa)}`} target="_blank" rel="noreferrer">
            WhatsApp
          </a>
        )}
        <a href="#book" data-primary>
          Book
        </a>
      </div>

      <Script src="/widget.js" data-agent={agent.id} data-color={t.accent} data-label="Ask us anything" strategy="afterInteractive" />
    </div>
  );
}
