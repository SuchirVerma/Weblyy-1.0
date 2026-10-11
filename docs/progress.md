# Progress log

Add newest entries at the top.

| Date | What | Status |
|---|---|---|
| 2026-09-29 | Website makeover: the homepage is opened in a real browser on a laptop and a phone (screenshots, speed, sideways scroll, tap targets, alt text, brand colours/fonts/photos). `lib/makeover.ts` scores 8 areas (Design, UX, Mobile, Content, SEO, Performance, CTA/Conversion, Missing features) and runs the *same* checks on the redesign. The redesign (`/preview/<scanId>`, live at `/site/<id>`) only uses the business's own words, prices, photos, logo, colours and contact details; missing facts are listed for the owner, never made up. Before ↔ After slider in the report and the dashboard's My website tab. Load time isn't compared until the redesign is live on the internet | ✅ Done |
| 2026-09-26 | Search by business name or @instagram; Instagram profile scanning (bio, followers, link in bio); owner inbox with replies delivered to the customer's chat (and WhatsApp via Twilio), agent pause/hand-back; clean light theme | ✅ Done |
| 2026-09-26 | Real-site mode: headless Chrome rendering, parked-domain detection, cleaner extraction, full site report (download/print), clinic medical-safety workflow, smarter agent (synonyms, FAQ answers, honest "not listed" replies). Tested on 8 real Delhi businesses | ✅ Done |
| 2026-09-26 | Working prototype in `apps/web`: crawler, scoring, AI + rules agent, deploy, live console, phone chat, Twilio webhook, n8n export | ✅ Done |
| 2026-09-26 | Repo created with full project spec in `docs/` | ✅ Done |

## Checklist
- [x] Project spec
- [x] Crawler + detector
- [x] Scan UI (streamed log + radar)
- [x] Classifier + scoring (rules engine, AI refinement when a key is set)
- [x] Workflow board + blueprint
- [x] Agent with Hinglish + owner escalation
- [x] Twilio WhatsApp webhook (needs a public URL to test)
- [x] n8n workflow export (auto-create needs an n8n instance)
- [x] QR chat + live counters
- [x] Roast mode
- [x] Before/after "Saturday replay"
- [x] Built-in demo salon (works offline)
- [ ] Test Twilio sandbox end to end
- [ ] Deploy publicly (Vercel/Railway) and set APP_URL
- [ ] Shareable report card
- [ ] Backup demo video
