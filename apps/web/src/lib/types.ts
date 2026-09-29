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
  instagram?: { handle: string; url: string; followers: string; posts: string; bio: string; link: string };
  /** Technical and content signals from the homepage, used by the AI readiness audit */
  signals?: SiteSignals;
  services: string[];
  /** Words, images and brand marks taken verbatim from the site, so a redesign can keep them */
  content?: SiteContent;
  /** Trimmed visible text of the crawled pages, for the agent's context */
  text: string;
}

/** Everything here is copied from the original site as-is. Nothing is written by Weblyy. */
export interface SiteContent {
  /** The homepage's main headline (H1) */
  headline: string;
  /** The first real paragraph under the headline */
  subheadline: string;
  about: string[];
  sections: { heading: string; text: string; page: string }[];
  testimonials: { quote: string; author: string }[];
  nav: string[];
  ctas: string[];
  logo: string;
  favicon: string;
  ogImage: string;
  themeColor: string;
  images: { src: string; alt: string }[];
}

export interface SiteSignals {
  https: boolean;
  viewport: boolean;
  title: string;
  h1: string;
  metaDescription: string;
  jsonLdTypes: string[];
  ctaCount: number;
  ogImage: boolean;
  wordCount: number;
  h1Count?: number;
  /** Times a heading level is skipped (H1 straight to H4 and so on) */
  headingSkips?: number;
  lang?: string;
  canonical?: boolean;
  ogTitle?: boolean;
  navCount?: number;
  /** tel:, WhatsApp and mailto links on the page */
  contactLinks?: number;
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
  /** The five-category AI readiness audit */
  audit?: import("./audit").Audit;
  /** The same audit with everything Weblyy adds switched on, for the before/after view */
  auditAfter?: import("./audit").Audit;
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

export interface WebPresence {
  query: string;
  /** False when every search engine failed, so "nothing found" isn't a real result. */
  searched: boolean;
  ownSiteFound: boolean;
  listings: { platform: string; url: string; title: string; rating?: number; reviews?: number }[];
  mentions: number;
}

export interface ScanResult {
  knowledge: SiteKnowledge;
  touchpoints: Touchpoint[];
  gaps: string[];
  presence?: WebPresence | null;
  /** The homepage measured in a real browser, with screenshots. Missing when no browser is available. */
  capture?: Capture | null;
}

/** One device's measurements of a page, taken in a real browser. */
export interface PageMetrics {
  loadMs: number;
  bytes: number;
  requests: number;
  heightPx: number;
  overflowX: boolean;
  smallText: number;
  smallTargets: number;
  ctaAboveFold: string[];
  images: number;
  imagesNoAlt: number;
  brokenImages: number;
  unlabeledInputs: number;
  vagueLinks: number;
  fonts: string[];
  stickyContact: boolean;
}

export interface Capture {
  url: string;
  desktop: PageMetrics | null;
  mobile: PageMetrics | null;
  /** Screenshot file names, served by /api/shot */
  shots: { desktop?: string; mobile?: string };
  brand: { colors: string[]; headingFont: string; bodyFont: string; images: { src: string; alt: string; w: number; h: number }[]; logo: string };
  /** The rendered homepage HTML, so the same checks can read it */
  html: string;
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
