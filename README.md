# Weblyy

**The website a business like yours should have.**

Weblyy takes a small business's existing website (or just its name, or its Instagram handle), reads it the way a customer would, and shows the owner what is missing. Then it builds the fixed version: a better website, an assistant that answers customers from the business's own information, a place where every enquiry is saved, and follow-ups that run by themselves.

It is built for local businesses in India: salons, clinics, restaurants, schools, coaching centres, gyms, shops and service providers.

**Live:** https://weblyy.vercel.app

```
Website, name or @instagram
   → Scan           read the site like a customer
   → Report         AI readiness score and what is missing
   → Go live        one tap creates the owner's dashboard
   → Dashboard      website · assistant · customers · search · autopilot · results
```

## Contents

- [Try it in two minutes](#try-it-in-two-minutes)
- [Features](#features)
- [Pages](#pages)
- [How it works](#how-it-works)
- [Settings](#settings)
- [Deploying](#deploying)
- [Project layout](#project-layout)
- [Docs](#docs)
- [Team](#team)

## Try it in two minutes

You need Node.js 20 or newer.

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
```

No keys or accounts are needed. Open the app and click **Try the demo salon**. It scans a made-up salon that ships with the project (`apps/web/public/demo/kesar`), so it works offline.

For a faster run, or to open the QR codes from a phone on the same Wi-Fi, use the production build:

```bash
npm run build && npm start
```

## Features

### 1. Three ways to start

| You type | What Weblyy does |
|---|---|
| A website, like `northdelhidentalclinic.com` | Scans it directly |
| A business name, like "North Delhi Dental Clinic Model Town" | Searches the web and lets you pick the right website or Instagram profile |
| An Instagram handle, like `@naturalssalon` | Reads the public profile (name, followers, bio, contact numbers) and follows the link in bio if there is one |

A business that is only on Instagram is told plainly "you don't have a website yet", and Weblyy generates one.

### 2. The scan

- Reads the site's HTML, then opens it in a real headless Chrome to catch pages built with JavaScript, injected WhatsApp buttons and chat widgets.
- Finds every way a customer can reach the business: WhatsApp links, phone numbers, emails, forms, booking widgets, chat tools, social profiles and map links.
- Collects what the business has published: services, prices, opening hours, address, FAQs, about text, photos and reviews.
- Opens the home page on a laptop and on a phone, takes screenshots and measures speed, sideways scrolling, tap sizes, text size and missing image descriptions.
- Checks where else the business shows up online.
- Detects parked or empty domains instead of scoring them.
- Streams progress live, so the owner watches the touchpoints appear.
- Stays safe: private and internal addresses are blocked, redirects are followed by hand and the number of pages is capped.

### 3. AI readiness report

- One score out of 100, split into five areas: **Website, Customer Assistant, Lead Capture, AI Search Readiness, Automation**.
- A plain-language list of problems found and opportunities.
- Four one-tap questions fill in what a website cannot show, such as how many enquiries arrive each day.
- **Site report:** every contact detail, hours, prices, FAQs, tools and forms found, what is missing and which pages were read. It downloads as Markdown or prints to PDF.
- Every manual job gets an automation score, `Volume × Repetitiveness × Data × (1 − Risk)`, with hours saved per week and rupees saved per month. Sensitive work is marked **human only**.
- An optional **Roast my website** mode says the same things less politely.

### 4. Tailored to the type of business

Weblyy does not give every business the same buttons. It recognises eight kinds of business and changes the goal, the form fields, the quick buttons, the assistant's behaviour and the scoring weights for each.

| Business | Main goal on the site |
|---|---|
| Salon | Book an appointment |
| Clinic | Book a consultation, with medical questions always passed to a human |
| Restaurant | Reserve a table |
| School | Admission enquiry, not appointment booking |
| Coaching centre | Book a free demo class |
| Gym or fitness studio | Book a free trial |
| Shop | Ask about a product |
| Service provider | Request a call back |

### 5. A new website for the business

- A complete site built only from what the scan found. Nothing is invented: if the business never published a price, the site does not show one.
- Pages for home, services, about, gallery, FAQ and contact, each created only when there is content for it.
- Every business gets its own look. The accent colour comes from the business's real brand colour when one is found, and the font pair, corner style, background tone, hero layout and card style are picked per business, so two salons do not look alike.
- A 3D hero scene chosen to suit the business, from 42 designs (galaxy, ripple, aurora, skyline, petals and more).
- A lead form and quick buttons that match the business type.
- Generated sites are marked so search engines do not index them.

### 6. Or keep the current website and improve it

For owners who like their design, Weblyy serves the business's **real site** unchanged and only adds what is missing:

- Call, WhatsApp and Book buttons, where the site does not already have them.
- A booking or enquiry form that saves straight to the dashboard.
- The chat assistant.
- Structured business details for Google and AI apps.

Nothing of the owner's is restyled or removed. A before and after view compares the original and the improved version, with the same eight checks run on both.

### 7. Customer assistant

- Answers from the business's own content: services, prices, timings, address, FAQs, about text and reviews. It quotes the page an answer came from.
- Keeps its own copy of the whole site (up to 30 pages) and refreshes it once a day, so answers stay current.
- Understands English and Hinglish.
- Never guesses. A complaint, a refund, a medical question or anything not on the site is passed to the owner.
- Refund requests always get the same answer, that the owner will contact the customer, and are logged to the team's Google Sheet with an email, so a person follows up. The owner can add an email in Settings to get these alerts directly.
- Works without any external AI service. Replies come from a built-in rules engine, so there is no cost per message.
- AI replies are optional. Add a free API key from Groq, OpenRouter, Google Gemini, Cerebras or Mistral (tried in that order) and the assistant answers with an AI model instead. Add several keys and they form a chain: when one runs out of free quota, is slow or fails, the next one takes over, and if all of them fail the rules engine answers.
- Reaches customers four ways: a chat link, a QR code for the counter, a one-line chat bubble for any website, and WhatsApp through Twilio.

```html
<script src="https://YOUR-WEBLYY-URL/widget.js" data-agent="AGENT_ID" async></script>
```

### 8. Owner inbox

- Every conversation is saved.
- Chats that need a person show up as **Needs you**, on the dashboard and on a private page made for the owner's phone.
- The owner's reply appears in the customer's chat within seconds, labelled as the owner. WhatsApp customers get it on WhatsApp.
- The assistant stays quiet for that customer until the owner taps **Hand back to agent**.

### 9. Customers and leads

- A name and number are captured from chats and from forms on the site.
- Each lead is marked hot, warm or cold, with the reasons shown.
- Status tracking and a one-click follow-up message.

### 10. Get found online

- Checks how ready the business is for Google and for AI search apps.
- Generates the pieces to fix it: meta tags, structured business data (JSON-LD), FAQ markup and an `llms.txt` file.
- Gives recommendations only. It makes no ranking promises.

### 11. Autopilot

- Switches for each job: lead capture, lead qualification and follow-up, booking requests, form leads, escalation to the owner, and WhatsApp.
- A run log shows what each job did and when.
- Exports a ready-to-import n8n workflow, or creates it in your n8n automatically when n8n keys are set.

### 12. The owner's dashboard

One private link per business, with nine tabs:

| Tab | What is there |
|---|---|
| Home | Score before and after, and what to do next |
| Go live | Steps to put it in front of customers, and the free setup call |
| My website | The new site, or the original and improved versions side by side |
| Chats | Every conversation and the inbox |
| Customers | Saved leads with their status |
| Get found online | Search readiness and the generated files |
| Autopilot | Job switches and the run log |
| Results | Messages answered, customers saved and time saved |
| Settings | Links, the chat bubble snippet and connections |

### 13. Free setup call

- An owner can ask the Weblyy team to set everything up.
- The request is saved first, then sent as an SMS to the team and added as a row in a Google Sheet. The sheet's script also emails the team.
- Each delivery is retried by itself (1 minute, 5 minutes, 15 minutes, 1 hour, 3 hours, then every 12 hours) and never creates a duplicate.
- A team page lists every request with its delivery status and a **Retry now** button.

Setup steps are in [docs/notifications.md](docs/notifications.md).

### 14. Ask Weblyy

A guide on Weblyy's own pages that answers questions about the product in English or Hinglish. Press `/` to open it. Paste a website into it and it offers to analyse that site.

### 15. Local pages

Landing pages for Delhi NCR, Jammu and Kashmir and Mumbai, written with local places and PIN codes.

## Pages

| Path | What it is |
|---|---|
| `/` | Landing page |
| `/find` | Search by business name |
| `/scan` | The live scan and the report |
| `/preview/<scanId>` | Preview of the new website before going live |
| `/dashboard/<id>?key=…` | The owner's private dashboard |
| `/site/<id>` | The generated website |
| `/mirror/<id>/original` and `/mirror/<id>/enhanced` | The real site, as it is and with the additions |
| `/chat/<id>` | Full-screen customer chat, opened from the link or QR code |
| `/owner/<id>?key=…` | The owner's inbox on a phone |
| `/owner-demo` | A guided walk through an evening at a salon from the owner's side |
| `/how` | How it works |
| `/integrate` | Setup guide: chat bubble, WhatsApp, QR code and API |
| `/setup` | The free setup call |
| `/team` | The team's view of setup requests |
| `/delhi`, `/jammu-kashmir`, `/mumbai` | Local landing pages |

## How it works

```
Browser ──► /api/scan ─────► crawl.js + capture.js (Cheerio, headless Chrome)
                               └► detect.js, audit.js, presence.js
        ──► /api/analyze ──► score.js, profiles.js
        ──► /api/workspace ► creates the business: website, assistant, search pack, automations
Customer ─► /chat, widget.js, WhatsApp ──► /api/agent ──► respond.js ──► ai.js (optional) ──► rules-agent.js
                                                              └► leads.js, automations.js
Owner ────► /dashboard, /owner ──► /api/agents/<id>/inbox
Setup call ► /api/setup-request ──► outbox.js ──► SMS + Google Sheet
```

- **One app.** A single Next.js project holds the pages and every API route.
- **Storage.** On a laptop, data is saved as JSON files in `apps/web/.data`. When Redis keys are present it switches to Upstash Redis, which is what the deployed site uses.
- **Browser.** Locally it uses the Chrome already installed. On Vercel it uses a serverless Chromium build.
- **Limits.** Scans, chats and forms are rate limited per visitor.

## Settings

Everything is optional. Copy `.env.example` to `apps/web/.env.local` and fill in only what you need.

| Setting | What it turns on |
|---|---|
| `APP_URL` | The public address used in QR codes and webhook links |
| `GROQ_API_KEY`, `GEMINI_API_KEY`, `CEREBRAS_API_KEY`, `MISTRAL_API_KEY`, `OPENROUTER_API_KEY` | AI replies. Any one is enough; several make a fallback chain |
| `AI_PROVIDERS`, `GROQ_MODEL` and similar | The order providers are tried in, and the model each one uses |
| `SERPER_API_KEY` or `BRAVE_SEARCH_API_KEY` | Search by business name when deployed (free search engines block cloud servers) |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis storage instead of local files |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` | WhatsApp replies |
| `N8N_URL`, `N8N_API_KEY` | Creating the workflow in your n8n automatically |
| `SHEETS_WEBHOOK_URL`, `SHEETS_SECRET` | Setup requests saved to a Google Sheet, with an email |
| `FAST2SMS_API_KEY` (or `TWILIO_SMS_FROM`) and `SETUP_SMS_TO` | Setup requests sent to the team by SMS |
| `ADMIN_KEY` | Access to `/team` on a deployed site |
| `CRON_SECRET` | Protects the daily retry job |
| `CHROME_PATH`, `DISABLE_BROWSER` | Use a different Chrome, or turn the browser step off |
| `GOOGLE_SITE_VERIFICATION` | Google Search Console verification |

Never commit `.env.local`. It is already ignored by git.

## Deploying

The app runs on Vercel as it is.

1. Import the repository and set the root directory to `apps/web`.
2. Add an Upstash Redis database, so data survives between requests.
3. Add `SERPER_API_KEY` if you want search by business name.
4. Add any other settings from the table above, then redeploy.

A daily job (`/api/cron/outbox`, set in `apps/web/vercel.json`) retries setup requests that have not been delivered.

## Project layout

```
apps/web/
  src/app/           pages and API routes
  src/components/    scan, report, dashboard (cc), generated site, guide
  src/lib/           crawler, scoring, assistant, leads, automations, storage
  public/            widget.js, weblyy-addons.js and the demo salon
docs/                overview, screens, architecture, demo script, setup guides
```

| File | What it does |
|---|---|
| `lib/crawl.js` | Safe crawler and content extraction |
| `lib/capture.js` | Real-browser screenshots and measurements |
| `lib/detect.js`, `lib/audit.js` | Touchpoints, gaps and the readiness score |
| `lib/profiles.js` | What each type of business needs |
| `lib/score.js` | Workflow templates and the automation score |
| `lib/rules-agent.js`, `lib/respond.js` | The assistant and the reply flow |
| `lib/ai.js`, `lib/ai-chain.js` | Optional AI replies and the provider fallback chain |
| `lib/site-library.js` | The assistant's copy of the whole site |
| `lib/leads.js`, `lib/automations.js` | Lead capture, qualification and follow-ups |
| `lib/aisearch.js` | Search readiness and the generated files |
| `lib/makeover.js`, `lib/mirror.js` | Before and after checks, and the improved real site |
| `lib/outbox.js`, `lib/sheet.js`, `lib/sms.js` | Setup request delivery |
| `lib/store.js`, `lib/kv.js` | Storage on files or Redis |
| `components/site/` | The generated website, its themes and the 3D scenes |

**Built with:** Next.js 16, React 19, Three.js, Motion, Cheerio, Playwright with Chromium, Upstash Redis, Zod, Twilio and n8n.

## Docs

| Doc | Contents |
|---|---|
| [Overview and pitch](docs/01-overview.md) | Problem, solution and pitch summary |
| [UI screens](docs/02-ui-screens.md) | Every screen in detail |
| [Tech stack and architecture](docs/03-tech-stack.md) | Stack, scoring formula and detector rules |
| [Add-ons](docs/04-add-ons.md) | Extras that make the demo interactive |
| [Notifications](docs/notifications.md) | Setting up the SMS and the Google Sheet |
| [Progress log](docs/progress.md) | What has been built |
| [App guide](apps/web/README.md) | Running the app and the demo flow |

## Status

Weblyy is a working prototype. The assistant runs on its own rules engine unless AI keys are added. The AI provider chain has been tested on the live site with Groq, Gemini and OpenRouter keys. WhatsApp and n8n need your own accounts and have not been tested end to end.

## Team

Built together by Palash Kuchroo, Pranav Verma and Suchir Verma.
