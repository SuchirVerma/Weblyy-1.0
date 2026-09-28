/** Automation definitions shared by the server (to decide what runs) and the Command Center (to show them). */

export interface AutomationDef {
  key: string;
  name: string;
  trigger: string;
  steps: string[];
  description: string;
  /** false = always on (safety) */
  toggleable: boolean;
  defaultOn: boolean;
  /** Needs an external service before it can run */
  requires?: "twilio" | "n8n";
}

export const AUTOMATIONS: AutomationDef[] = [
  {
    key: "capture",
    name: "Save interested customers",
    trigger: "A customer asks a question",
    steps: ["A customer asks about a service", "Your assistant answers", "It asks for their name and phone number", "They appear under Customers"],
    description: "Your assistant answers questions and asks for a name and phone number, so you can call them back.",
    toggleable: true,
    defaultOn: true,
  },
  {
    key: "qualify",
    name: "Show who to call first",
    trigger: "A new customer is saved",
    steps: ["A new customer is saved", "Weblyy checks how interested they are", "They are marked Hot, Warm or Cold", "A WhatsApp reply is written for you"],
    description: "Every new customer is marked Hot, Warm or Cold, with a WhatsApp reply ready for you to send in one tap.",
    toggleable: true,
    defaultOn: true,
  },
  {
    key: "booking",
    name: "Take appointment requests",
    trigger: "A customer wants an appointment",
    steps: ["A customer wants an appointment", "Your assistant asks which service and what time", "You get the request", "You confirm with one reply"],
    description: "Your assistant asks which service and what time. You confirm with one reply.",
    toggleable: true,
    defaultOn: true,
  },
  {
    key: "form",
    name: "Collect website enquiries",
    trigger: "Someone fills your website form",
    steps: ["Someone fills the form on your website", "They are saved under Customers", "They are marked Hot, Warm or Cold", "You get a message"],
    description: "When someone fills the form on your website, they show up under Customers straight away.",
    toggleable: true,
    defaultOn: true,
  },
  {
    key: "escalate",
    name: "Send difficult chats to you",
    trigger: "Complaint, refund or medical question",
    steps: ["A customer complains or asks something sensitive", "Your assistant says sorry and promises nothing", "You get an alert", "You reply yourself"],
    description: "Complaints, refunds and medical questions always come to you. Your assistant never answers these itself.",
    toggleable: false,
    defaultOn: true,
  },
  {
    key: "whatsapp",
    name: "Reply on WhatsApp",
    trigger: "A WhatsApp message",
    steps: ["A customer messages you on WhatsApp", "Your assistant replies straight away", "Anything tricky comes to you"],
    description: "The same assistant answers messages on your WhatsApp Business number. Our team connects it for you.",
    toggleable: true,
    defaultOn: true,
    requires: "twilio",
  },
  {
    key: "n8n",
    name: "Connect your other apps",
    trigger: "Any message",
    steps: ["Open Settings", "Download the ready-made file", "Your tech person adds it to your tools"],
    description: "Optional, for your tech person: a ready-made file that links your assistant to apps like Google Sheets.",
    toggleable: false,
    defaultOn: true,
    requires: "n8n",
  },
];

/** Older saved activity used these names; show the new plain-language ones instead. */
const OLD_NAMES: Record<string, string> = {
  "Turn questions into leads": "Save interested customers",
  "Qualify and follow up new leads": "Show who to call first",
  "Appointment requests": "Take appointment requests",
  "Website form to Lead Center": "Collect website enquiries",
  "Escalate sensitive chats": "Send difficult chats to you",
  "WhatsApp auto-replies": "Reply on WhatsApp",
  "Business made AI-ready": "Your business went live",
};
export const runName = (name: string) => OLD_NAMES[name] ?? name;
export const runDetail = (detail: string) =>
  detail.replace(/ scored \d+ \((hot|warm|cold)\) · follow-up drafted/, (_, t: string) => ` is ${t === "hot" ? "very interested" : t === "warm" ? "interested" : "just asking"} · reply ready to send`);

export const automationDef = (key: string) => AUTOMATIONS.find((a) => a.key === key);

export function isOn(settings: Record<string, boolean> | undefined, key: string) {
  const def = automationDef(key);
  if (!def) return false;
  if (!def.toggleable) return true;
  return settings?.[key] ?? def.defaultOn;
}
