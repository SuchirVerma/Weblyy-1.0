# UI screens

Flow: `URL → Live scan → Score → Questions → Workflow board → Blueprint → Deploy → Live agent → Report`

Design: dark UI, one accent color, Inter/Geist for text, monospace for data.

## 1. Landing
- Large URL input (`yourbusiness.com`) with a **Scan** button.
- Example chips: *Salon · Clinic · Coaching institute* (load cached demos).
- Live counter: "1,284 workflows discovered so far."

## 2. Live scan (the "wow" screen)
- **Left:** terminal-style log streamed over SSE:
  - `✓ Found WhatsApp link (wa.me/91…)`
  - `✓ Found booking form: 4 fields (name, phone, service, date)`
  - `✓ Found price list: 23 services`
  - `⚠ No auto-reply detected on contact email`
- **Right:** React Flow graph that builds itself. Touchpoints pop in as nodes (WhatsApp green, email blue, form orange) around the business node.
- Progress stages: *Crawling → Extracting → Classifying → Scoring*.

## 3. Automation Readiness Score
- Lighthouse-style circular gauge, 0–100.
- Sub-scores: Responsiveness · Channel coverage · Repetitive load · Automation potential.
- Headline: "~9 hrs/week spent on repeat questions · ₹14,000/month recoverable".

## 4. Smart questions
Five one-tap cards with answer chips, for example:
- "How many WhatsApp enquiries per day?" `<10 · 10–50 · 50+`
- "Do you send appointment reminders?" `Manually · No · Automated`
- "Who replies to enquiries?" `Owner · Staff · Nobody consistently`

Optional: upload a WhatsApp chat export (`.txt`) to mine real repeat questions ("38% of messages ask about price").

## 5. Workflow board
| Workflow | Channel | Score | Hours saved/wk | Verdict |
|---|---|---|---|---|
| Price enquiries | WhatsApp | 92 | 4.5 | 🟢 Automate |
| Appointment booking | Form + WhatsApp | 85 | 3 | 🟢 Automate |
| Reminders & no-shows | WhatsApp | 80 | 1.5 | 🟢 Automate |
| Review requests | WhatsApp/SMS | 70 | 0.5 | 🟡 Assist |
| Complaints / refunds | Any | 20 | — | 🔴 Human only |

## 6. Blueprint view
- Mini flow diagram: Trigger → AI step → Action → Human handoff.
- Agent card: role, knowledge sources (scraped pages), guardrails ("never promise discounts", "escalate complaints").
- Buttons: `Download n8n JSON` · `Copy system prompt` · **`Deploy now`**

## 7. Live agent console
- **Left:** phone mockup showing the WhatsApp conversation live.
- **Right:** agent "thinking" panel: intent, knowledge source used, confidence, escalation.
- **Top:** counters for Messages handled · Escalated to human · Time saved.
- QR code so customers can chat with the bot from a phone.

## 8. Shareable report
One-page report card (PDF/image): score, top 3 automations, hours and ₹ saved, "Deploy all" CTA.
