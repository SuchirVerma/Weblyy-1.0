export type Channel = "whatsapp" | "email" | "phone" | "form" | "booking" | "chat" | "social" | "web";

export interface Touchpoint {
  id: string;
  channel: Channel;
  label: string;
  detail: string;
  /** Where on the site it was found */
  page: string;
}

export interface PriceItem {
  name: string;
  price: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface FormInfo {
  page: string;
  fields: string[];
  purpose: string;
}

/** Everything the crawler learned about the business. Also the agent's knowledge. */
export interface SiteKnowledge {
  url: string;
  name: string;
  description: string;
  businessType: BusinessType;
  pages: { url: string; title: string }[];
  prices: PriceItem[];
  faqs: FaqItem[];
  hours: string[];
  address: string;
  phones: string[];
  emails: string[];
  whatsapp: string[];
  forms: FormInfo[];
  embeds: string[];
  socials: string[];
  socialLinks: { name: string; url: string }[];
  mapUrl: string;
  /** Whether a real browser was used (JavaScript content included) */
  rendered: boolean;
  services: string[];
  /** Trimmed visible text of the crawled pages, for the agent's context */
  text: string;
}

export type BusinessType = "salon" | "clinic" | "restaurant" | "education" | "retail" | "fitness" | "services";

export type Verdict = "automate" | "assist" | "human";

export interface Workflow {
  id: string;
  name: string;
  channel: Channel;
  channels: Channel[];
  trigger: string;
  description: string;
  volume: number;
  repetitiveness: number;
  dataAvailability: number;
  risk: number;
  score: number;
  hoursPerWeek: number;
  verdict: Verdict;
  reason: string;
  agentSteps: string[];
  guardrails: string[];
}

export interface Answers {
  dailyMessages: number;
  replier: "owner" | "staff" | "nobody";
  reminders: "manual" | "none" | "automated";
  afterHours: "yes" | "sometimes" | "no";
  hourlyCost: number;
}

export interface SubScores {
  responsiveness: number;
  coverage: number;
  repetitiveLoad: number;
  potential: number;
}

export interface Analysis {
  readiness: number;
  subScores: SubScores;
  workflows: Workflow[];
  hoursPerWeek: number;
  rupeesPerMonth: number;
  summary: string;
  roast: string[];
  findings: string[];
  engine: "ai" | "rules";
}

export interface ScanResult {
  knowledge: SiteKnowledge;
  touchpoints: Touchpoint[];
  gaps: string[];
}

export type ScanEvent =
  | { type: "log"; level: "info" | "ok" | "warn"; text: string }
  | { type: "stage"; stage: "crawl" | "extract" | "detect" | "done" }
  | { type: "touchpoint"; touchpoint: Touchpoint }
  | { type: "result"; scanId: string; result: ScanResult }
  | { type: "error"; message: string };

export interface AgentReply {
  reply: string;
  intent: string;
  escalate: boolean;
  source: string;
  engine: "ai" | "rules";
}

export interface ChatTurn {
  role: "customer" | "agent";
  text: string;
}
