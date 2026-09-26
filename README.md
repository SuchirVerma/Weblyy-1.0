# FlowScout

> **From website to working agent in 5 minutes.**

Paste a business URL. FlowScout finds the customer conversations the team handles by hand (WhatsApp, email, forms, bookings), scores which ones are safe to automate, and deploys a working AI agent in minutes.

**Status:** 🚧 Build in progress. See [docs/progress.md](docs/progress.md).

## What it does
1. **Scan:** crawls the website and maps every customer touchpoint (WhatsApp links, forms, emails, booking widgets, FAQs, price lists).
2. **Ask:** 5 one-tap questions (plus an optional WhatsApp chat export) reveal the manual work behind those touchpoints.
3. **Score:** each workflow gets an automation score, hours saved per week and ₹ saved per month. Sensitive work is flagged as *human only*.
4. **Deploy:** top workflows become importable n8n blueprints, and one agent goes live on WhatsApp, trained on the site's own content.

## Docs
| Doc | Contents |
|---|---|
| [Overview & pitch](docs/01-overview.md) | Problem, solution, pitch summary, taglines |
| [UI screens](docs/02-ui-screens.md) | All 8 screens in detail |
| [Tech stack & architecture](docs/03-tech-stack.md) | Stack, architecture, scoring formula, detector rules |
| [Add-ons](docs/04-add-ons.md) | Features that make the demo interactive and fun |
| [Progress log](docs/progress.md) | Running log of what's done |

## Repo layout
```
apps/web   → Next.js 15 frontend
apps/api   → FastAPI backend (crawler, classifier, scorer, deployer)
docs/      → project spec and progress log
```

## Tech
Next.js · Tailwind · shadcn/ui · React Flow · Framer Motion · FastAPI · Playwright · AI API (Sonnet 5 + Haiku 4.5) · Supabase · n8n · Twilio WhatsApp
