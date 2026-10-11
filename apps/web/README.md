# Weblyy web app

One Next.js app: the landing page, the scan → ask → score → deploy flow, the live agent console, the customer chat page, and every API route.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

For a faster run, use the production build (faster, and phones on the same Wi-Fi can open the QR code):

```bash
npm run build && npm start
```

**Real websites:** the scanner reads the site's HTML, then opens it in the Chrome installed on this machine (headless) to catch JavaScript-built pages, injected WhatsApp buttons and chat widgets, and sites that block simple bots. No Chrome? It still works on plain HTML. Set `CHROME_PATH` to use a different Chrome/Chromium, or `DISABLE_BROWSER=1` to turn this off.

The results page includes a **site report**: every contact detail, hours, published prices, FAQs, tools and forms found, what's missing, and the pages read. Download it as Markdown or print it to PDF.

No API keys are needed. The app uses its own rules engine for scoring and replies, and switches to AI replies when a provider key is added. Add keys in `.env.local` (see `/.env.example` at the repo root).

## The demo flow

1. Home page → enter a website, business name or @instagram → **Analyze My Website**.
2. The scan streams in; click **See my AI readiness report**.
3. The report: an AI readiness score across **Website, AI Customer Agent, Lead Capture, AI Search Readiness, Automation**, with detected problems and opportunities. (Optional: refine with 4 quick questions.)
4. **Make My Business AI-Ready** → opens the **AI Business Command Center** (`/dashboard/<id>?key=…`, private).
5. **Website**: the AI-ready website (`/site/<id>`), built from the scanned content, with the agent and a lead form.
6. **AI Agent**: chat as a customer; ask a price, then share a name and number.
7. **AI Search**: readiness checks, recommendations, and generated meta tags, JSON-LD, FAQs and llms.txt (no ranking promises).
8. **Leads**: the Lead Center with AI qualification (hot/warm/cold + reasons), status, and one-click follow-up.
9. **Automations**: toggles and a live run log (lead capture, qualification + follow-up, booking requests, form leads, escalation, WhatsApp, n8n).
10. **Analytics** and **Settings** (connections, snippets, links).

The original single-workflow path (blueprint → hold to deploy → live console with owner inbox) is still there under "Automation opportunities" on the report.

## What you can type

- **A business name**, like "North Delhi Dental Clinic Model Town". Weblyy searches the web (Brave, then DuckDuckGo, then DuckDuckGo in a real browser; results cached for 6 hours) and lets you pick the right website or Instagram profile. Set `BRAVE_SEARCH_API_KEY` for the official Brave API.
- **A website**, like `northdelhidentalclinic.com`.
- **An Instagram handle or link**, like `@naturalssalon`. It reads the public profile (name, followers, bio, contact numbers in the bio), then follows the link in bio to the website if there is one.

## Showing it to a business owner

- **/owner-demo** (also on the home page): a guided, auto-playing evening at a salon from the owner's phone. Price questions are handled silently, a booking needs one tap, a complaint arrives as an urgent alert and the owner replies personally, then hands back to the agent.
- **/integrate**: the setup guide for owners. Website chat bubble (one line, with WordPress/Wix/Shopify steps), WhatsApp via Twilio, QR at the counter, chat link for Instagram bio and Google profile, and the HTTP API.
- **/api/demo-agent**: switches on an agent for the demo salon and opens the salon's website with the chat bubble on it.

## Website chat bubble

```html
<script src="https://YOUR-WEBLYY-URL/widget.js" data-agent="AGENT_ID" async></script>
```

Optional `data-color` and `data-label`. The live console shows the snippet with the real agent ID.

## Owner inbox

Every conversation is saved. When the agent flags one (complaint, refund, medical question, anything not on the website), it shows up as **Needs you** in the owner inbox, both in the live console and on a private page for the owner's phone (`/owner/<id>?key=…`, linked from the console). When the owner replies:

- the reply appears in the customer's chat within a couple of seconds, labelled as the owner;
- the agent pauses for that customer until the owner taps **Hand back to agent**;
- WhatsApp customers get the reply on WhatsApp if `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` and `TWILIO_WHATSAPP_FROM` are set.

## Try it

1. Open the app, click **Try the demo salon** (a fictional salon bundled in `public/demo/kesar/`), or paste any real website.
2. Answer the four questions, see the score, flip **Roast my website**.
3. Open a workflow, **hold** the deploy button, and chat with the live agent. Complaints trigger an owner alert.
4. Scan the QR code with a phone on the same Wi-Fi to chat as a customer. Every message shows up in the console.

## Map of the code

| Path | What it does |
|---|---|
| `src/lib/crawl.js` | Safe crawler: blocks private addresses, follows redirects by hand, reads up to 6 pages, extracts WhatsApp links, forms, embeds, prices, FAQs, hours, address |
| `src/lib/detect.js` | Turns what was crawled into touchpoints and gaps |
| `src/lib/score.js` | Workflow templates, the scoring formula, readiness sub-scores, roast lines |
| `src/lib/ai.js`, `src/lib/ai-chain.js` | Optional AI layer. Tries each free provider that has a key, moves to the next when one hits its limit or fails, and hands over to the rules engine when none can answer |
| `src/lib/rules-agent.js` | Keyword agent with Hinglish support, answers every customer message |
| `src/lib/n8n.js` | Generates an importable n8n workflow (WhatsApp in → agent → reply, owner alert branch) |
| `src/lib/store.js` | In-memory scans and deployed agents (agents persist to `.data/agents.json`) |
| `src/app/api/*` | `scan` (NDJSON stream), `analyze`, `deploy`, `agent`, `agents/[id]`, `whatsapp` (Twilio webhook), `status` |
| `src/app/chat/[id]` | Full-screen customer chat opened from the QR code |

## Hooking up real WhatsApp (Twilio sandbox)

1. Deploy the app somewhere public (or run a tunnel such as `ngrok http 3000`) and set `APP_URL`.
2. In the Twilio console, open the WhatsApp sandbox and set **When a message comes in** to the webhook URL shown in the console after deploying (`/api/whatsapp?agent=<id>`).
3. Text the sandbox number. Replies come from the same agent.
