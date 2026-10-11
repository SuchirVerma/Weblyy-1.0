# Tech stack & architecture

> **As built:** one Next.js app does both the frontend and the backend. The original plan split the backend into FastAPI + Playwright; a single app is simpler to run and deploy, and a fetch + Cheerio crawler covers server-rendered small-business sites. Playwright remains the upgrade path for JavaScript-only sites.

| Layer | Choice | Why |
|---|---|---|
| App | Next.js 16 (App Router) + React 19 + TypeScript | Frontend and API routes in one deployable app |
| Styling | Tailwind 4 + CSS modules, design tokens in `globals.css` | Full control over the custom look |
| Animation | Motion (Framer Motion) + CSS | Radar blips, gauge sweep, counters, hold-to-deploy |
| Crawling | `fetch` + Cheerio, SSRF-safe (private IPs blocked, manual redirects, size and time caps) | Fast, no headless browser needed |
| Realtime scan | NDJSON stream from `/api/scan` | Streams the scan log and touchpoints to the UI |
| AI fallback | Rules engine + keyword agent with Hinglish | Works with no API key, a customer always gets a reply |
| Storage | In-memory, agents persisted to `.data/agents.json` | Zero setup to run locally |
| Automation | Generated n8n workflow JSON; auto-created if `N8N_URL` + `N8N_API_KEY` are set | Real, importable output |
| WhatsApp | Twilio sandbox webhook at `/api/whatsapp` | Works in minutes without Meta verification |
| Audience demo | QR code → `/chat/[id]` mobile chat, live counters on the console | Lets the room talk to the agent |

## Architecture
```
 Browser ──NDJSON──► /api/scan ──► crawl.ts (fetch + Cheerio) ──► detect.ts (touchpoints, gaps)
         ──JSON────► /api/analyze ──► score.ts (rules) ──► ai.js (optional refine)
         ──JSON────► /api/deploy ──► store.ts (agent) + n8n.ts (workflow JSON) ──► n8n API (optional)
 Customer phones ──► /chat/[id] ──► /api/agent ──► respond.ts ──► ai.js (optional) or rules-agent.ts
 WhatsApp (Twilio) ─► /api/whatsapp ─┘
 Console polls /api/agents/[id] every 2s for live counters and the audience feed
```

## Scoring formula
```
Automation score = Volume × Repetitiveness × Data-availability × (1 − Risk)
Hours saved/wk   = msgs/day × 7 × avg handling time × automatable %
₹ saved/month    = hours saved × 4.3 × local staff hourly cost
```

## Detector rules
- `wa.me` / `api.whatsapp.com` links
- `mailto:` / `tel:` links
- `<form>` elements and their fields
- Booking embeds: Calendly, Fresha, Setmore, Google Forms
- Chat widgets: Tawk, Intercom, Crisp
- Price tables and FAQ sections
- Instagram / Facebook DM links
- "Call us to book"-style text patterns

## Verdict rules
- Risk ≥ 0.6 → **Human only**, whatever the score
- Score ≥ 40 → **Automate**
- Otherwise → **Assist** (agent drafts, a person approves)

## Environment variables
See [`.env.example`](../.env.example).
