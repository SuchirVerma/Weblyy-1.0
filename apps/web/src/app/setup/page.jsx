import { Arrow, Nav, Reveal } from "@/components/ui";
import Link from "next/link";
import styles from "@/components/landing.module.css";
export const metadata = {
  title: "We set it up for you | Weblyy",
  description: "Book a free setup call. The Weblyy team connects your AI customer agent, WhatsApp, website and lead center for you.",
  alternates: { canonical: "/setup" },
};
export default function SetupPage() {
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1} style={{ paddingBottom: 80 }}>
        <section id="setup" className={`wrap ${styles.section}`} style={{ paddingTop: 40 }} aria-labelledby="plug-h">
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
              <Link className="btn btn-primary" href="/#product">
                Analyze my website <Arrow />
              </Link>
              <a className="btn btn-ghost" href="/api/demo-agent" target="_blank" rel="noreferrer">
                See a live example
              </a>
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
