# Tech stack & architecture

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js 15 + Tailwind + shadcn/ui | Fast to build, polished by default |
| Graph visuals | React Flow | Touchpoint map and blueprint diagrams |
| Animation | Framer Motion | Node pop-ins, gauge sweep, counters |
| Charts | Recharts | Hours saved, message volume |
| Backend | FastAPI (Python) | Better crawling and data ecosystem |
| Crawling | Playwright (Firecrawl fallback) | Renders JS-heavy sites, catches embeds |
| Realtime | Server-Sent Events | Streams scan log to the UI |
| LLM | AI Sonnet 5 (classify, score, agent replies) + Haiku 4.5 (page extraction) | Strong reasoning plus cheap, fast extraction |
| Agent knowledge | Site content in the prompt, with prompt caching | Small sites fit in context; no vector DB needed |
| Database | Supabase (Postgres + auth + realtime) | Scans, workflows, messages; realtime counters |
| Automation engine | n8n (self-hosted, Docker) | Import generated workflows via REST API |
| WhatsApp | Twilio WhatsApp Sandbox | Works in minutes; Meta Cloud API needs business verification |
| Email | Resend | Automated replies and reports |
| Hosting | Vercel (web) + Railway/Render (API + n8n) | Playwright doesn't run well on serverless |

## Architecture
```
 Next.js UI ──SSE──► FastAPI
                      ├─ Crawler (Playwright) ──► page text, links, forms, widgets
                      ├─ Detector (rules)     ──► wa.me, mailto, tel, <form>, Calendly/Fresha/Tawk embeds
                      ├─ Classifier (AI)  ──► workflows + risk
                      ├─ Scorer               ──► automation score, hours & ₹ saved
                      ├─ Blueprint generator  ──► n8n JSON + agent system prompt
                      └─ Deployer ──► n8n API ──► Twilio WhatsApp webhook ──► live agent
 Supabase: scans · touchpoints · workflows · messages (realtime → UI counters)
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

## Data model (draft)
- `scans`: id, url, status, score, created_at
- `touchpoints`: id, scan_id, channel, kind, details (json)
- `workflows`: id, scan_id, name, channel, score, hours_saved, verdict, blueprint (json)
- `agents`: id, workflow_id, system_prompt, twilio_number, status
- `messages`: id, agent_id, direction, body, intent, escalated, created_at

## Environment variables
See [`.env.example`](../.env.example).
