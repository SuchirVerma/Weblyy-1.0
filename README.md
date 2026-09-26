# FlowScout: the AI-Ready Business Platform

> **We don't just build websites. We transform existing businesses into AI-ready businesses.**

Give us your existing website. FlowScout audits it, transforms it into an AI-ready website, adds an AI Customer Agent, improves AI search readiness, captures and qualifies leads, and runs the follow-up automations, all from one AI Business Command Center.

```
Existing website → AI Business Audit → AI Readiness Score → Website Transformation
→ AI Customer Agent → AI Search Optimization → Lead Capture → Lead Qualification
→ Automations → AI Business Command Center
```

**Status:** working prototype. See [docs/progress.md](docs/progress.md).

## Run it

```bash
cd apps/web
npm install
npm run dev        # http://localhost:3000
```

No keys needed to try it: click **Try the demo salon**. Details in [apps/web/README.md](apps/web/README.md).

## What it does
1. **Scan:** crawls the website and maps every customer touchpoint (WhatsApp links, forms, emails, booking widgets, FAQs, price lists), streamed live onto a radar.
2. **Ask:** 4 one-tap questions fill in what a website can't show.
3. **Score:** each workflow gets an automation score (Volume × Repetitiveness × Data × (1 − Risk)), hours saved per week and ₹ saved per month. Sensitive work is flagged as *human only*. Optional **Roast my website** mode.
4. **Deploy:** hold the button and an agent goes live: a chat link, a QR code for the audience, a Twilio WhatsApp webhook, and an importable n8n workflow.

## Docs
| Doc | Contents |
|---|---|
| [Overview & pitch](docs/01-overview.md) | Problem, solution, pitch summary, taglines |
| [UI screens](docs/02-ui-screens.md) | All screens in detail |
| [Tech stack & architecture](docs/03-tech-stack.md) | Stack, architecture, scoring formula, detector rules |
| [Add-ons](docs/04-add-ons.md) | Features that make the demo interactive and fun |
| [Progress log](docs/progress.md) | Running log of what's done |

## Tech
Next.js 16 · React 19 · Tailwind 4 · Motion · Cheerio · AI API (optional) · Twilio WhatsApp · n8n
