/**
 * What each kind of business actually needs from its website. Everything that used to be "Book, Call, Chat and automations
 * for everyone" reads from here instead: the audit, the generated site, the add-ons on a real site, the agent and the
 * automations. Add a feature to a profile only when that kind of customer would really use it.
 *
 * Safe to import on the client: no server-only code.
 */

/** @typedef {{ name: string, label: string, type?: string, placeholder?: string, options?: string[], required?: boolean }} Field */

const F = {
  name: { name: "name", label: "Your name", required: true },
  phone: { name: "phone", label: "Phone number", type: "tel", required: true },
  service: { name: "service", label: "Service", placeholder: "Choose a service" },
  when: { name: "when", label: "Preferred day and time", placeholder: "e.g. Saturday 4 pm" },
  note: { name: "note", label: "Anything else?", placeholder: "Optional" },
};

export const PROFILES = {
  salon: {
    key: "salon",
    label: "Salon",
    goal: {
      id: "booking",
      requests: "Appointment requests",
      cta: "Book an appointment",
      short: "Book",
      title: "Book an appointment",
      done: "Appointment request sent. The salon will confirm your slot.",
      fields: [F.name, F.phone, F.service, F.when],
    },
    quick: ["call", "whatsapp", "goal"],
    sections: ["services", "prices", "gallery", "reviews", "faq", "contact"],
    needs: { booking: true, prices: true, reviews: true, gallery: true, hours: true },
    agent: { mode: "full", greeting: "Ask me about prices, timings or booking a slot." },
    automations: ["capture", "qualify", "booking", "reminders", "reviews", "escalate", "form"],
    weights: { website: 0.25, agent: 0.2, leads: 0.2, search: 0.2, automation: 0.15 },
  },
  clinic: {
    key: "clinic",
    label: "Clinic",
    goal: {
      id: "booking",
      requests: "Appointment requests",
      cta: "Book a consultation",
      short: "Book",
      title: "Book a consultation",
      done: "Request sent. The clinic will call to confirm your appointment.",
      fields: [F.name, F.phone, { name: "service", label: "Doctor or treatment", placeholder: "Optional" }, F.when],
    },
    quick: ["call", "whatsapp", "goal", "directions"],
    sections: ["services", "doctors", "timings", "faq", "contact"],
    needs: { booking: true, prices: false, reviews: true, gallery: false, hours: true },
    agent: { mode: "full", greeting: "Ask me about timings, doctors or booking a consultation.", noMedical: true },
    automations: ["capture", "qualify", "booking", "reminders", "reviews", "escalate", "form"],
    weights: { website: 0.25, agent: 0.15, leads: 0.2, search: 0.25, automation: 0.15 },
  },
  restaurant: {
    key: "restaurant",
    label: "Restaurant",
    goal: {
      id: "reservation",
      requests: "Table requests",
      cta: "Reserve a table",
      short: "Reserve",
      title: "Reserve a table",
      done: "Reservation request sent. The restaurant will confirm shortly.",
      fields: [F.name, F.phone, { name: "people", label: "How many people?", type: "number", placeholder: "2" }, F.when],
    },
    quick: ["call", "directions", "goal"],
    sections: ["menu", "gallery", "reviews", "timings", "contact"],
    needs: { booking: false, reservation: true, prices: true, reviews: true, gallery: true, hours: true, directions: true },
    agent: { mode: "answers", greeting: "Ask me about the menu, timings or a table." },
    automations: ["capture", "reviews", "escalate", "form"],
    weights: { website: 0.3, agent: 0.1, leads: 0.15, search: 0.3, automation: 0.15 },
  },
  school: {
    key: "school",
    label: "School",
    goal: {
      id: "admission",
      requests: "Admission enquiries",
      cta: "Admission enquiry",
      short: "Enquire",
      title: "Admission enquiry",
      done: "Enquiry sent. The admissions office will contact you.",
      fields: [
        { name: "name", label: "Parent's name", required: true },
        F.phone,
        { name: "service", label: "Class applying for", placeholder: "e.g. Nursery, Class 6" },
        { name: "note", label: "Student's name", placeholder: "Optional" },
      ],
    },
    quick: ["call", "directions", "goal"],
    sections: ["about", "admissions", "fees", "facilities", "notices", "gallery", "contact"],
    needs: { booking: false, admissions: true, fees: true, notices: true, gallery: true, hours: true, directions: true },
    agent: { mode: "answers", greeting: "Ask me about admissions, fees or school timings." },
    automations: ["capture", "form", "escalate"],
    weights: { website: 0.35, agent: 0.05, leads: 0.25, search: 0.3, automation: 0.05 },
  },
  coaching: {
    key: "coaching",
    label: "Coaching",
    goal: {
      id: "demo",
      requests: "Demo class requests",
      cta: "Book a free demo class",
      short: "Free demo",
      title: "Book a free demo class",
      done: "Request sent. The institute will call you with demo class timings.",
      fields: [F.name, F.phone, { name: "service", label: "Course", placeholder: "Which course?" }, { name: "when", label: "Preferred batch", placeholder: "Morning, evening, weekend" }],
    },
    quick: ["call", "whatsapp", "goal"],
    sections: ["courses", "fees", "results", "faculty", "faq", "contact"],
    needs: { booking: false, demo: true, prices: true, reviews: true, hours: true },
    agent: { mode: "full", greeting: "Ask me about courses, fees, batches or a free demo class." },
    automations: ["capture", "qualify", "form", "escalate"],
    weights: { website: 0.25, agent: 0.15, leads: 0.3, search: 0.2, automation: 0.1 },
  },
  fitness: {
    key: "fitness",
    label: "Gym",
    goal: {
      id: "trial",
      requests: "Trial requests",
      cta: "Book a free trial",
      short: "Free trial",
      title: "Book a free trial session",
      done: "Request sent. The gym will confirm your trial.",
      fields: [F.name, F.phone, { name: "service", label: "Interested in", placeholder: "Gym, yoga, Zumba…" }, F.when],
    },
    quick: ["call", "whatsapp", "goal"],
    sections: ["programs", "plans", "trainers", "gallery", "timings", "contact"],
    needs: { booking: false, trial: true, prices: true, reviews: true, gallery: true, hours: true },
    agent: { mode: "full", greeting: "Ask me about plans, timings or a free trial." },
    automations: ["capture", "qualify", "form", "reviews", "escalate"],
    weights: { website: 0.25, agent: 0.15, leads: 0.25, search: 0.2, automation: 0.15 },
  },
  retail: {
    key: "retail",
    label: "Shop",
    goal: {
      id: "enquiry",
      requests: "Product enquiries",
      cta: "Ask about a product",
      short: "Ask",
      title: "Ask about a product",
      done: "Sent. The shop will reply about availability.",
      fields: [F.name, F.phone, { name: "service", label: "What are you looking for?", placeholder: "Product name, size, colour" }],
    },
    quick: ["call", "whatsapp", "directions"],
    sections: ["products", "gallery", "timings", "contact"],
    needs: { booking: false, prices: true, reviews: true, gallery: true, hours: true, directions: true },
    agent: { mode: "answers", greeting: "Ask me about products, stock or shop timings." },
    automations: ["capture", "form", "escalate"],
    weights: { website: 0.35, agent: 0.1, leads: 0.2, search: 0.25, automation: 0.1 },
  },
  services: {
    key: "services",
    label: "Business",
    goal: {
      id: "quote",
      requests: "Call-back requests",
      cta: "Request a call back",
      short: "Call back",
      title: "Request a call back",
      done: "Request sent. The team will call you back.",
      fields: [F.name, F.phone, { name: "service", label: "What do you need?", placeholder: "A line about your requirement" }],
    },
    quick: ["call", "whatsapp", "goal"],
    sections: ["services", "about", "faq", "contact"],
    needs: { booking: false, prices: false, reviews: true, hours: true },
    agent: { mode: "answers", greeting: "Ask me about our services or request a call back." },
    automations: ["capture", "qualify", "form", "escalate"],
    weights: { website: 0.3, agent: 0.1, leads: 0.25, search: 0.25, automation: 0.1 },
  },
};

const SCHOOL = /\b(school|cbse|icse|ib board|state board|nursery|kindergarten|pre-?school|play ?school|primary|senior secondary|principal|class (?:i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|[1-9]|1[0-2])\b|pta|montessori)\b/gi;
const COACHING = /\b(coaching|tuition|batch|jee|neet|upsc|ssc|crash course|test series|institute|classes)\b/gi;

/** Which profile fits this business. Works on old records too, since it only needs the knowledge object. */
export function profileKeyOf(k) {
  if (!k) return "services";
  const type = k.segment || k.businessType || "services";
  if (type === "school" || type === "coaching") return type;
  if (type === "education") {
    const text = [k.name, k.description, ...(k.services || []), ...(k.pages || []).map((p) => p.title || "")].join(" ");
    const s = text.match(SCHOOL)?.length ?? 0;
    const c = text.match(COACHING)?.length ?? 0;
    return s > c ? "school" : "coaching";
  }
  return PROFILES[type] ? type : "services";
}

export const profileOf = (k) => PROFILES[profileKeyOf(k)];

/** Instagram-only businesses have no website of their own. */
export function hasOwnWebsite(k) {
  if (!k) return false;
  return !(k.url || "").includes("instagram.com") && !(k.instagram && (k.pages || []).every((p) => (p.url || "").includes("instagram.com")));
}

/** Does this business need the AI agent switched on by default? Schools and shops start with it off. */
export const agentByDefault = (k) => profileOf(k).agent.mode === "full";
