import Link from "next/link";
import { CodeBlock } from "@/components/code-block";
import { Arrow, Fold, Footer, Nav } from "@/components/ui";
import styles from "./integrate.module.css";

export const metadata = { title: "Add it to your business | Weblyy", description: "Add the Weblyy AI chat assistant to any website with one line of code, or connect it to WhatsApp.", alternates: { canonical: "/integrate" } };

const WIDGET = `<script src="{ORIGIN}/widget.js" data-agent="YOUR_AGENT_ID" async></script>`;
const API = `curl -X POST {ORIGIN}/api/agent \\
  -H "content-type: application/json" \\
  -d '{"agentId":"YOUR_AGENT_ID","message":"Hair spa kitne ka hai?","from":"customer-123"}'

# → {"reply":"Hair Spa: ₹1,200. Aapke liye slot book kar du?","intent":"price","escalate":false,...}`;

const PLATFORMS = [
  ["WordPress", "Install the free “WPCode” plugin → Code Snippets → Add snippet → paste → Site-wide footer."],
  ["Wix", "Settings → Custom code → Add code → paste → Body, end → All pages."],
  ["Shopify", "Online Store → Themes → Edit code → theme.liquid → paste just above </body>."],
  ["Plain HTML", "Paste it just above </body> on every page."],
] as const;

export default function IntegratePage() {
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1} className={`wrap ${styles.page}`}>
        <header className={styles.hero}>
          <div className="card" style={{ padding: "20px 24px", display: "grid", gap: 8, borderColor: "var(--accent)" }}>
            <b style={{ fontSize: "1.15rem" }}>Not technical? You can skip this whole page.</b>
            <span className="muted">
              Analyze your website, click &ldquo;Make my business AI-ready&rdquo;, then open <b>Go live → Let us set it up for you</b>. Our team calls you and does
              everything below for free. This page is for people who want to do it themselves.
            </span>
          </div>
          <p className="kicker">Do it yourself</p>
          <h1 className="h-display" style={{ fontSize: "clamp(2.2rem, 5vw, 3.8rem)", maxWidth: "18ch" }}>
            Put the agent where your customers <span className="em">already are.</span>
          </h1>
          <p className="lede">
            No new app for your customers to download, and no developer needed. Switch the agent on once, then connect it to your website, WhatsApp, QR codes
            and Instagram bio. Every chat lands in one owner inbox.
          </p>
          <div className="chips">
            <Link className="btn btn-primary" href="/">
              Start with your business name <Arrow />
            </Link>
            <a className="btn btn-ghost" href="/api/demo-agent" target="_blank" rel="noreferrer">
              See a live example
            </a>
          </div>
        </header>

        <ol className={styles.timeline}>
          <li>
            <span className={styles.num}>1</span>
            <div>
              <h2>Switch it on</h2>
              <p className="muted">About two minutes, all in the browser.</p>
              <ul className={styles.checks}>
                <li>Type your business name, website or @instagram on the home page.</li>
                <li>Check what we found, answer four quick questions, and see your score.</li>
                <li>Pick a workflow and hold the button. Your agent is live, with its own chat link, QR code and owner inbox.</li>
              </ul>
            </div>
          </li>

          <li>
            <span className={styles.num}>2</span>
            <div>
              <h2>Connect your channels</h2>
              <p className="muted">Pick any. They all talk to the same agent and the same inbox.</p>

              <div className="folds">
                <Fold icon="01" title="Website chat bubble" summary="A chat button in the corner of your website. One line of code." badge="Ready">
                  <CodeBlock code={WIDGET} label="Paste before </body>" />
                  <ul className={styles.platforms}>
                    {PLATFORMS.map(([p, how]) => (
                      <li key={p}>
                        <b>{p}</b>
                        <span>{how}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.small}>
                    Your agent ID is shown in the live console after you switch the agent on. Optional: <code>data-color=&quot;#000000&quot;</code> and{" "}
                    <code>data-label=&quot;Book on chat&quot;</code>.
                  </p>
                  <a className="btn btn-ghost btn-sm" href="/api/demo-agent" target="_blank" rel="noreferrer" style={{ justifySelf: "start" }}>
                    Preview it on the demo salon&apos;s website
                  </a>
                </Fold>

                <Fold icon="02" title="WhatsApp number" summary="Customers message your usual WhatsApp number and the assistant replies." badge="Needs Twilio">
                  <ol className={styles.steps}>
                    <li>
                      <b>Test today (free, ~10 min):</b> create a Twilio account, open Messaging → Try WhatsApp, and join the sandbox from your phone.
                    </li>
                    <li>
                      In the sandbox settings, paste the <b>webhook URL</b> from your live console into &ldquo;When a message comes in&rdquo;.
                    </li>
                    <li>
                      Add <code>TWILIO_ACCOUNT_SID</code>, <code>TWILIO_AUTH_TOKEN</code> and <code>TWILIO_WHATSAPP_FROM</code> so owner replies are delivered on
                      WhatsApp.
                    </li>
                    <li>
                      <b>Go live on your own number:</b> register it as a WhatsApp Business sender in Twilio (or Meta&apos;s Cloud API). Meta verifies the business,
                      which usually takes 1 to 3 days. The number must not be in use on the regular WhatsApp app.
                    </li>
                  </ol>
                </Fold>

                <Fold icon="03" title="QR code at the counter" summary="Customers scan it and chat in their phone's browser. Nothing to install." badge="Ready">
                  <p className="muted" style={{ margin: 0 }}>
                    Print the QR code from your live console on the counter, menu, visiting cards or posters: &ldquo;Scan to ask us anything, we reply
                    instantly.&rdquo;
                  </p>
                </Fold>

                <Fold icon="04" title="Instagram & Google profile" summary="Put your chat link in your Instagram bio and Google listing." badge="Link ready">
                  <p className="muted" style={{ margin: 0 }}>
                    Use it as the website or booking link on your Google Business Profile too. Replying to Instagram DMs directly needs a Meta-approved app, which
                    is on our roadmap.
                  </p>
                  <CodeBlock code={`{ORIGIN}/chat/YOUR_AGENT_ID`} label="Your chat link" />
                </Fold>

                <Fold icon="05" title="Your own tools" summary="An n8n workflow or one HTTP request, for developers." badge="For developers">
                  <CodeBlock code={API} label="HTTP API" />
                </Fold>
              </div>
            </div>
          </li>

          <li>
            <span className={styles.num}>3</span>
            <div>
              <h2>Answer only what needs you</h2>
              <p className="muted">The owner inbox works on any phone. Open the owner link once and add it to your home screen.</p>
              <ul className={styles.checks}>
                <li>
                  <b>Handled by the agent:</b> prices, timings, location, services, FAQs. You see them in the inbox, but nothing pings you.
                </li>
                <li>
                  <b>Needs you:</b> bookings to confirm, complaints, refunds, medical questions, anything not on your website.
                </li>
                <li>
                  <b>You reply, they see it instantly.</b> The agent pauses for that customer until you tap &ldquo;Hand back to agent&rdquo;.
                </li>
              </ul>
              <Link className="btn btn-ghost btn-sm" href="/owner-demo">
                Watch the owner demo <Arrow />
              </Link>
            </div>
          </li>

          <li>
            <span className={styles.num}>4</span>
            <div>
              <h2>Keep answers right</h2>
              <p className="muted">The agent only knows what your website and Instagram say.</p>
              <ul className={styles.checks}>
                <li>Changed a price or your timings? Update your website, then scan again. The agent picks it up.</li>
                <li>Put prices and FAQs on your site. The more it says, the more the agent can answer without you.</li>
                <li>The agent never invents discounts, never gives medical advice, and never promises refunds.</li>
              </ul>
            </div>
          </li>
        </ol>

      </main>
      <div data-tone="dark" className={styles.faqBand}>
        <section className={`wrap ${styles.faq}`} aria-labelledby="faq-h">
          <h2 id="faq-h" className="h-section" style={{ fontSize: "clamp(1.8rem, 3.4vw, 2.6rem)" }}>
            Questions owners <span className="em">usually ask</span>
          </h2>
          {[
            ["Do my customers need to install anything?", "No. They chat from your website, WhatsApp, or a link in their phone's browser."],
            ["What if the agent doesn't know the answer?", "It says it will check with the team, flags the chat for you, and you reply from the inbox."],
            ["Does it speak Hinglish?", "Yes. It replies in the customer's language, including Hinglish."],
            ["Can I stop it from answering someone?", "Yes. Reply to that customer or tap “Take over”, and the agent stays quiet for them until you hand it back."],
            ["Where do customer messages go?", "Only to your agent and your inbox. The agent answers from your own website content and nothing else."],
          ].map(([q, a]) => (
            <details key={q} className={styles.q}>
              <summary>{q}</summary>
              <p className="muted">{a}</p>
            </details>
          ))}
        </section>
      </div>
      <Footer />
    </>
  );
}
