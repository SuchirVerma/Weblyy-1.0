import { HeroVisual } from "@/components/hero-visual";
import { CinematicIntro } from "@/components/intro/cinematic-intro";
import { OwnerDemo } from "@/components/owner-demo";
import { SaturdayReplay } from "@/components/saturday-replay";
import { Steps } from "@/components/steps";
import { Arrow, CountUp, Nav, Reveal, ScanBar } from "@/components/ui";
import Link from "next/link";
import styles from "@/components/landing.module.css";

export default function Home() {
  return (
    <>
      <CinematicIntro nextId="product" />
      <div id="product" style={{ scrollMarginTop: 0 }} />
      <Nav />
      <main id="main" tabIndex={-1}>
        <section className={`wrap ${styles.hero}`}>
          <div className={styles.heroCopy}>
            <p className="kicker">The AI-Ready Business Platform</p>
            <h1 className={`h-display ${styles.heroTitle}`}>
              Make your business <span className="em">AI-ready.</span>
            </h1>
            <p className="lede">
              Paste your website. Get your AI score, an agent that answers customers 24/7, and every chat turned into a lead.
            </p>
            <ScanBar />
            <a href="#how" className={styles.secondary}>
              See how it works ↓
            </a>
          </div>
          <HeroVisual />
        </section>

        <section id="platform" className={`wrap ${styles.section}`} aria-labelledby="platform-h">
          <Reveal>
            <p className="kicker">One platform, five modules</p>
            <h2 id="platform-h" className="h-section" style={{ maxWidth: "26ch" }}>
              Everything a business needs to <span className="em">win customers in the AI era.</span>
            </h2>
          </Reveal>
          <ul className={styles.modules}>
            {[
              ["AI Website", "Website Transformation", "Your existing site, rebuilt mobile-first with clear calls to action, your real prices and FAQs, and a lead form."],
              ["AI Customer Agent", "Answers · qualifies · books", "Answers from your own website 24/7 in English and Hinglish, captures contact details, and hands tricky chats to you."],
              ["AI Search", "AI Search Readiness", "Structured business data, FAQs and clear descriptions that make it easier for AI assistants and search to understand you."],
              ["Lead Generation", "Lead Center", "Every interested visitor becomes a lead with an AI qualification: hot, warm or cold, with the reasons."],
              ["Automations", "Runs by itself", "Lead follow-ups, booking requests and owner alerts, with a live log of everything that ran."],
            ].map(([t, sub, d], i) => (
              <Reveal as="li" key={t} delay={i * 70} className={styles.module}>
                <span className={styles.moduleNum}>0{i + 1}</span>
                <b>{t}</b>
                <small>{sub}</small>
                <p className="muted">{d}</p>
              </Reveal>
            ))}
          </ul>
        </section>

        <section className={`wrap ${styles.strip}`} aria-label="A typical salon">
          <Reveal className={styles.stat}>
            <b>
              ~<CountUp to={40} />
            </b>
            <span>WhatsApp messages a day at a typical neighbourhood salon</span>
          </Reveal>
          <Reveal className={styles.stat} delay={90}>
            <b>
              <CountUp to={70} suffix="%" />
            </b>
            <span>are the same four questions: price, slot, timing, location</span>
          </Reveal>
          <Reveal className={styles.stat} delay={180}>
            <b>
              <CountUp to={6.5} decimals={1} /> hrs
            </b>
            <span>of typing every week, usually by the owner, usually late</span>
          </Reveal>
        </section>

        <section className={`wrap ${styles.section}`} aria-labelledby="replay-h">
          <Reveal>
            <p className="kicker">One Saturday, replayed</p>
            <h2 id="replay-h" className="h-section">
              Same salon. Same ten messages. <span className="em">Two very different evenings.</span>
            </h2>
            <p className="lede">Watch the day play out. On the left, the owner answers between haircuts. On the right, the agent answers from the website in seconds.</p>
          </Reveal>
          <Reveal delay={120}>
            <SaturdayReplay />
          </Reveal>
        </section>

        <section id="how" className={`wrap ${styles.section}`} aria-labelledby="how-h">
          <Reveal>
            <p className="kicker">How it works</p>
            <h2 id="how-h" className="h-section">
              From your website to an AI-ready business <span className="em">in minutes.</span>
            </h2>
          </Reveal>
          <Steps />
        </section>

        <section id="owner" className={`wrap ${styles.section}`} aria-labelledby="owner-h">
          <div className={styles.theoryHead}>
            <Reveal>
              <p className="kicker">The owner&apos;s side</p>
              <h2 id="owner-h" className="h-section">
                Your phone only rings <span className="em">when it matters.</span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="lede">
                Prices answered for you. Bookings in one tap. Complaints come to you first.
              </p>
            </Reveal>
          </div>
          <OwnerDemo />
        </section>

        <section id="setup" className={`wrap ${styles.section}`} aria-labelledby="plug-h">
          <Reveal className={styles.plug}>
            <div>
              <p className="kicker">No coding. Ever.</p>
              <h2 id="plug-h" className="h-section" style={{ marginBottom: 8 }}>
                Not technical? <span className="em">We set it up for you.</span>
              </h2>
              <p className="lede">
                You run the business. Our team connects Weblyy to your website and WhatsApp on a quick call, and checks everything works. Free.
              </p>
            </div>
            <ul className={styles.plugList}>
              {[
                ["1. Analyze your website", "Type your website or business name. Takes a minute."],
                ["2. Click “Make my business AI-ready”", "Your new website and assistant are ready instantly."],
                ["3. Tap “Request setup”", "We call you and put it on your website, WhatsApp and Google."],
                ["Or do it in one tap yourself", "Share your new link on Instagram and WhatsApp, or print the QR poster for your counter."],
              ].map(([t, d]) => (
                <li key={t}>
                  <b>{t}</b>
                  <span className="muted">{d}</span>
                </li>
              ))}
            </ul>
            <div className="chips">
              <Link className="btn btn-primary" href="/#main">
                Analyze my website <Arrow />
              </Link>
              <a className="btn btn-ghost" href="/api/demo-agent" target="_blank" rel="noreferrer">
                See a live example
              </a>
            </div>
          </Reveal>
        </section>

        <section className={`wrap ${styles.section} ${styles.never}`} aria-labelledby="never-h">
          <Reveal className={styles.neverStatement}>
            <p className="kicker">What we refuse to automate</p>
            <h2 id="never-h" className="h-section">
              A good assistant knows <span className="em">when to call the owner.</span>
            </h2>
            <p className="lede">Anything that could cost a customer&apos;s trust goes straight to a human, with an alert on the owner&apos;s phone.</p>
          </Reveal>
          <ul className={styles.neverList}>
            {[
              ["Complaints", "The agent apologises, promises nothing and alerts the owner at once."],
              ["Refunds & money", "No discounts, refunds or offers unless they're written on the site."],
              ["Health & safety", "Rashes, allergies, pain: always a person, never a bot."],
              ["Anything unknown", "If it isn't on the website, the agent says it will check, and asks you."],
            ].map(([t, d], i) => (
              <Reveal as="li" key={t} delay={i * 80}>
                <b>{t}</b>
                <span className="muted">{d}</span>
              </Reveal>
            ))}
          </ul>
        </section>

        <section className={`wrap ${styles.final}`} aria-labelledby="final-h">
          <Reveal className={styles.finalCard}>
            <p className="kicker" style={{ textAlign: "center" }}>
              We don&apos;t just build websites
            </p>
            <h2 id="final-h" className="h-display" style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)", marginTop: 10 }}>
              We transform businesses into <span className="em">AI-ready businesses.</span>
            </h2>
            <p className="lede" style={{ margin: "14px auto 28px", textAlign: "center" }}>
              Start with a free AI readiness audit. About a minute, no sign-up.
            </p>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ width: "100%", maxWidth: 580 }}>
                <ScanBar />
              </div>
            </div>
          </Reveal>
        </section>
      </main>
      <footer className={`wrap ${styles.footer}`}>
        <span>Weblyy · a B.Tech project</span>
        <span className="muted">The demo salon is a fictional business.</span>
      </footer>
    </>
  );
}
