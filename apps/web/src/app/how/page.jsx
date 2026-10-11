import { SaturdayReplay } from "@/components/saturday-replay";
import { Steps } from "@/components/steps";
import { CountUp, Nav, Reveal, ScanBar } from "@/components/ui";
import styles from "@/components/landing.module.css";
export const metadata = {
  title: "How it works | Weblyy",
  description:
    "How Weblyy reads a business website, shows what a business of its kind is missing, rebuilds the website from its own content, and adds extras like an assistant only where they help.",
  alternates: { canonical: "/how" },
};
export default function HowPage() {
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1} style={{ paddingBottom: 60 }}>
        <section id="how" className={`wrap ${styles.section}`} style={{ paddingTop: 40 }} aria-labelledby="how-h">
          <Reveal>
            <p className="kicker">How it works</p>
            <h2 id="how-h" className="h-section">
              From your website to an AI-ready business <span className="em">in minutes.</span>
            </h2>
          </Reveal>
          <Steps />
        </section>

        <section id="platform" className={`wrap ${styles.section}`} aria-labelledby="platform-h">
          <Reveal>
            <p className="kicker">What you get</p>
            <h2 id="platform-h" className="h-section" style={{ maxWidth: "26ch" }}>
              A website made for <span className="em">your kind of business.</span>
            </h2>
          </Reveal>
          <ul className={styles.modules}>
            {[
              [
                "Your website",
                "Made for your kind of business",
                "A school gets admissions, fees and notices. A restaurant gets its menu and table requests. A salon gets prices and booking. No website yet? We build one from your Instagram.",
              ],
              [
                "AI Search",
                "AI Search Readiness",
                "Structured business data, FAQs and clear descriptions that make it easier for AI assistants and search to understand you.",
              ],
              ["Enquiries", "Lead Center", "Every enquiry from your website lands in one place, so none get lost."],
              [
                "Extras, only if they help",
                "Assistant · automations",
                "An assistant that answers common questions, and follow-ups or reminders, switched on only where your customers need them.",
              ],
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
            <p className="lede">
              Watch the day play out. On the left, the owner answers between haircuts. On the right, the agent answers from the website in seconds.
            </p>
          </Reveal>
          <Reveal delay={120}>
            <SaturdayReplay />
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
              Every business gets <span className="em">the website it should have.</span>
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
        <span>Weblyy</span>
        <span className="muted">The demo salon is a fictional business.</span>
      </footer>
    </>
  );
}
