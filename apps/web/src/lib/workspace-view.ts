import "server-only";
import { AUTOMATIONS, isOn, runDetail, runName } from "./automations";
import type { DeployedAgent } from "./store";

const twilioReady = () => Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
const n8nReady = () => Boolean(process.env.N8N_URL && process.env.N8N_API_KEY);

/** The Command Center's data, shared by the page (first render) and the API (live refresh). */
export function workspaceView(agent: DeployedAgent) {
  const k = agent.knowledge;

  const intents: Record<string, number> = {};
  for (const l of agent.log) intents[l.intent] = (intents[l.intent] ?? 0) + 1;
  const bySource: Record<string, number> = {};
  for (const l of agent.leads) bySource[l.source] = (bySource[l.source] ?? 0) + 1;
  const conversations = Object.keys(agent.conversations).length;
  const handled = agent.log.filter((l) => !l.escalate).length;

  return {
    id: agent.id,
    createdAt: agent.createdAt,
    business: {
      name: k.name,
      type: k.businessType,
      url: k.url,
      description: k.description,
      address: k.address,
      hours: k.hours,
      phones: k.phones,
      whatsapp: k.whatsapp,
      emails: k.emails,
      prices: k.prices,
      faqs: k.faqs,
      services: k.services,
      socialLinks: k.socialLinks,
      pages: k.pages.length,
      instagram: k.instagram ?? null,
    },
    workspace: agent.workspace ?? null,
    stats: {
      messages: agent.stats.messages,
      escalations: agent.stats.escalations,
      customers: agent.stats.customers.length,
      conversations,
      handledByAgent: handled,
      minutesSaved: handled * 2,
    },
    leads: agent.leads.slice(0, 200),
    runs: agent.runs.slice(-60).reverse().map((r) => ({ ...r, automation: runName(r.automation), detail: runDetail(r.detail) })),
    automations: AUTOMATIONS.map((a) => ({
      ...a,
      on: isOn(agent.automations, a.key),
      ready: a.requires === "twilio" ? twilioReady() : true,
      runs: agent.runs.filter((r) => runName(r.automation) === a.name).length,
      lastRun: [...agent.runs].reverse().find((r) => runName(r.automation) === a.name)?.at ?? null,
    })),
    analytics: { intents, bySource },
    links: {
      sitePath: `/site/${agent.id}`,
      chatPath: `/chat/${agent.id}`,
      ownerPath: `/owner/${agent.id}?key=${agent.ownerKey}`,
      whatsappWebhookPath: `/api/whatsapp?agent=${agent.id}`,
    },
    integrations: { twilio: twilioReady(), n8n: n8nReady() },
    setupRequest: agent.setupRequest ?? null,
  };
}
