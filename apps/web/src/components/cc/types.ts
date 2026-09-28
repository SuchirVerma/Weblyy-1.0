import type { Audit } from "@/lib/audit";
import type { SearchPack } from "@/lib/aisearch";
import type { AutomationDef } from "@/lib/automations";
import type { FaqItem, PriceItem } from "@/lib/types";

export interface CCLead {
  id: string;
  createdAt: number;
  updatedAt: number;
  name: string;
  phone: string;
  email: string;
  interest: string;
  source: string;
  status: "new" | "qualified" | "booked" | "converted" | "lost";
  score: number;
  temperature: "hot" | "warm" | "cold";
  qualification: string[];
  from: string;
  followUp: string;
  followUpSent: boolean;
}

export interface CCRun {
  id: string;
  at: number;
  automation: string;
  steps: string[];
  detail: string;
}

export interface CCData {
  id: string;
  createdAt: number;
  business: {
    name: string;
    type: string;
    url: string;
    description: string;
    address: string;
    hours: string[];
    phones: string[];
    whatsapp: string[];
    emails: string[];
    prices: PriceItem[];
    faqs: FaqItem[];
    services: string[];
    socialLinks: { name: string; url: string }[];
    pages: number;
    instagram: { handle: string; followers: string } | null;
  };
  workspace: { createdAt: number; sourceUrl: string; auditBefore: Audit; auditAfter: Audit; search: SearchPack } | null;
  stats: { messages: number; escalations: number; customers: number; conversations: number; handledByAgent: number; minutesSaved: number };
  leads: CCLead[];
  runs: CCRun[];
  automations: (AutomationDef & { on: boolean; ready: boolean; runs: number; lastRun: number | null })[];
  analytics: { intents: Record<string, number>; bySource: Record<string, number> };
  links: { sitePath: string; chatPath: string; ownerPath: string; whatsappWebhookPath: string };
  integrations: { twilio: boolean; n8n: boolean };
  setupRequest: { at: number; name: string; phone: string; platform: string; bestTime: string; status: string } | null;
}

export const ago = (t: number) => {
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};
