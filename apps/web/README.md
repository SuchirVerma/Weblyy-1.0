# FlowScout web app

One Next.js app: the landing page, the scan → ask → score → deploy flow, the live agent console, the audience chat page, and every API route.

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

No API keys are needed. Without `AI_API_KEY` the app uses its rules engine for scoring and replies. Add keys in `.env.local` (see `/.env.example` at the repo root).

## Try it

1. Open the app, click **Try the demo salon** (a fictional salon bundled in `public/demo/kesar/`), or paste any real website.
2. Answer the four questions, see the score, flip **Roast my website**.
3. Open a workflow, **hold** the deploy button, and chat with the live agent. Complaints trigger an owner alert.
4. Scan the QR code with a phone on the same Wi-Fi to chat as a customer. Every message shows up in the console.

## Map of the code

| Path | What it does |
|---|---|
| `src/lib/crawl.ts` | Safe crawler: blocks private addresses, follows redirects by hand, reads up to 6 pages, extracts WhatsApp links, forms, embeds, prices, FAQs, hours, address |
| `src/lib/detect.ts` | Turns what was crawled into touchpoints and gaps |
| `src/lib/score.ts` | Workflow templates, the scoring formula, readiness sub-scores, roast lines |
| `src/lib/ai.ts` | Optional AI layer: refines workflows and writes agent replies with structured output |
| `src/lib/rules-agent.ts` | Keyword agent with Hinglish support, used when AI isn't configured |
| `src/lib/n8n.ts` | Generates an importable n8n workflow (WhatsApp in → agent → reply, owner alert branch) |
| `src/lib/store.ts` | In-memory scans and deployed agents (agents persist to `.data/agents.json`) |
| `src/app/api/*` | `scan` (NDJSON stream), `analyze`, `deploy`, `agent`, `agents/[id]`, `whatsapp` (Twilio webhook), `status` |
| `src/app/chat/[id]` | Full-screen customer chat opened from the QR code |

## Hooking up real WhatsApp (Twilio sandbox)

1. Deploy the app somewhere public (or run a tunnel such as `ngrok http 3000`) and set `APP_URL`.
2. In the Twilio console, open the WhatsApp sandbox and set **When a message comes in** to the webhook URL shown in the console after deploying (`/api/whatsapp?agent=<id>`).
3. Text the sandbox number. Replies come from the same agent.
