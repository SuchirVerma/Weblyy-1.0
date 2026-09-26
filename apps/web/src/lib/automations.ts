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
    name: "Turn questions into leads",
    trigger: "Customer question",
    steps: ["Customer question", "AI Customer Agent", "Answer", "Capture contact", "Create lead"],
    description: "When a customer shows interest, the agent answers and then asks for a name and number.",
    toggleable: true,
    defaultOn: true,
  },
  {
    key: "qualify",
    name: "Qualify and follow up new leads",
    trigger: "New lead",
    steps: ["New lead", "AI qualification", "Save to Lead Center", "Notify business", "Draft follow-up"],
    description: "Every lead gets a score, a hot/warm/cold label, and a ready-to-send follow-up message.",
    toggleable: true,
    defaultOn: true,
  },
  {
    key: "booking",
    name: "Appointment requests",
    trigger: "Appointment request",
    steps: ["Appointment request", "AI Customer Agent", "Qualification", "Owner confirms in inbox"],
    description: "The agent collects the service and time, then the owner confirms with one reply.",
    toggleable: true,
    defaultOn: true,
  },
  {
    key: "form",
    name: "Website form to Lead Center",
    trigger: "Website form",
    steps: ["Form submitted", "Create lead", "AI qualification", "Notify business"],
    description: "Enquiries from the AI-ready website's form land in the Lead Center, qualified.",
    toggleable: true,
    defaultOn: true,
  },
  {
    key: "escalate",
    name: "Escalate sensitive chats",
    trigger: "Complaint, refund or medical question",
    steps: ["Sensitive message", "Agent apologises, promises nothing", "Owner alerted", "Owner replies"],
    description: "Always on. Anything risky goes to a person, and the agent pauses for that customer.",
    toggleable: false,
    defaultOn: true,
  },
  {
    key: "whatsapp",
    name: "WhatsApp auto-replies",
    trigger: "WhatsApp message",
    steps: ["WhatsApp message", "AI Customer Agent", "Reply on WhatsApp"],
    description: "The same agent answers on your WhatsApp Business number through Twilio.",
    toggleable: true,
    defaultOn: true,
    requires: "twilio",
  },
  {
    key: "n8n",
    name: "n8n workflow",
    trigger: "Any message",
    steps: ["WhatsApp in", "AI Customer Agent", "Needs a human?", "Alert owner", "Reply"],
    description: "Download a ready-made n8n workflow to connect the agent to your other tools.",
    toggleable: false,
    defaultOn: true,
    requires: "n8n",
  },
];

export const automationDef = (key: string) => AUTOMATIONS.find((a) => a.key === key);

export function isOn(settings: Record<string, boolean> | undefined, key: string) {
  const def = automationDef(key);
  if (!def) return false;
  if (!def.toggleable) return true;
  return settings?.[key] ?? def.defaultOn;
}
