import { FormulaPlayground } from "@/components/formula";
import { HeroVisual } from "@/components/hero-visual";
import { OwnerDemo } from "@/components/owner-demo";
import { SaturdayReplay } from "@/components/saturday-replay";
import { Steps } from "@/components/steps";
import { Arrow, CountUp, Nav, Reveal, ScanBar } from "@/components/ui";
import Link from "next/link";
import styles from "@/components/landing.module.css";

export default function Home() {
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1}>
        <section className={`wrap ${styles.hero}`}>
          <div className={styles.heroCopy}>
            <p className="kicker">For salons, clinics, coaching centres and every shop that runs on WhatsApp</p>
            <h1 className={`h-display ${styles.heroTitle}`}>
              Your website already knows the answers. <span className="em">Why are you still typing them?</span>
            </h1>
            <p className="lede">
              Type your business name, website or Instagram. FlowScout finds every place customers reach you, spots the replies you type again and
              again, and switches on a WhatsApp agent that answers from your own site, in Hinglish too. Anything tricky comes to your inbox.
            </p>
            <ScanBar />
          </div>
          <HeroVisual />
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
              From a URL to a working agent <span className="em">in four steps.</span>
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
                Price questions never reach you. Bookings need one tap. Complaints arrive as an urgent alert, and your reply goes straight to the customer.
                Watch one evening play out.
              </p>
            </Reveal>
          </div>
          <OwnerDemo />
        </section>

        <section className={`wrap ${styles.section}`} aria-labelledby="plug-h">
          <Reveal className={styles.plug}>
            <div>
              <p className="kicker">Plug it into your business</p>
              <h2 id="plug-h" className="h-section" style={{ marginBottom: 8 }}>
                Website, WhatsApp, QR code, <span className="em">Instagram bio.</span>
              </h2>
              <p className="lede">One agent, every channel, one inbox. The website chat bubble is a single line of code, and the rest takes minutes.</p>
            </div>
            <ul className={styles.plugList}>
              {[
                ["Website chat bubble", "One line of code on WordPress, Wix, Shopify or any site"],
                ["WhatsApp number", "Through Twilio: test in 10 minutes, go live after Meta verification"],
                ["QR at the counter", "Customers scan and chat, nothing to install"],
                ["Instagram & Google", "Chat link in your bio and on your Google profile"],
              ].map(([t, d]) => (
                <li key={t}>
                  <b>{t}</b>
                  <span className="muted">{d}</span>
                </li>
              ))}
            </ul>
            <div className="chips">
              <Link className="btn btn-primary" href="/integrate">
                See the setup guide <Arrow />
              </Link>
              <a className="btn btn-ghost" href="/api/demo-agent" target="_blank" rel="noreferrer">
                Try the chat bubble on a live site
              </a>
            </div>
          </Reveal>
        </section>

        <section id="theory" className={`wrap ${styles.section}`} aria-labelledby="theory-h">
          <div className={styles.theoryHead}>
            <Reveal>
              <p className="kicker">The math, out in the open</p>
              <h2 id="theory-h" className="h-section">
                Every workflow gets a score <span className="em">you can argue with.</span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="lede">
                No black box. Four factors, each between 0 and 1, multiplied together. Drag them and see why price questions get automated and complaints
                never do.
              </p>
            </Reveal>
          </div>
          <Reveal delay={150}>
            <FormulaPlayground />
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
            <h2 id="final-h" className="h-display" style={{ fontSize: "clamp(2rem, 5vw, 3.6rem)" }}>
              See what your website <span className="em">is hiding.</span>
            </h2>
            <p className="lede" style={{ margin: "14px auto 28px", textAlign: "center" }}>
              One scan, about a minute. No sign-up.
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
        <span>FlowScout · a B.Tech project</span>
        <span className="muted">The demo salon is a fictional business.</span>
      </footer>
    </>
  );
}
