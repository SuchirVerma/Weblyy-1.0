import { hasOwnWebsite, profileOf } from "./profiles";
/** Does the business's own content mention this? Used for type-specific checks such as fees or a menu. */
function mentions(k, re) {
  const text = [k.name, k.description, ...(k.services || []), ...(k.faqs || []).map((f) => `${f.q} ${f.a}`), ...(k.prices || []).map((x) => x.name), ...(k.pages || []).map((x) => x.title || "")].join(" ");
  return re.test(text);
}
/** Checks only some kinds of business need, e.g. fees and admissions for a school, a menu for a restaurant. */
function typeChecks(p, k, rebuilt) {
  const c = (label, ok, yes, no) => ({ label, ok: ok || rebuilt ? true : false, detail: ok ? yes : rebuilt ? "Laid out on the new website." : no });
  switch (p.key) {
    case "school":
      return [
        c("Admissions information", mentions(k, /admission|enrol/i), "Admission details found.", "Parents can't find how or when to apply."),
        c("Fee structure", mentions(k, /\bfee/i), "Fee details found.", "No fee information. Parents call just to ask."),
        c("Facilities and notices", mentions(k, /facilit|lab|library|transport|bus|notice|circular|event/i), "Facilities or notices found.", "No facilities, transport or notices shown."),
      ];
    case "restaurant":
      return [c("Menu online", k.prices.length >= 5 || mentions(k, /menu/i), "Menu found.", "No menu on the site. Customers decide elsewhere.")];
    case "retail":
      return [c("Products shown", k.prices.length >= 3 || mentions(k, /product|collection|catalog/i), "Products found.", "No products shown. Visitors can't see what you sell.")];
    case "clinic":
      return [c("Doctors and timings", mentions(k, /\bdr\.?\s|doctor|specialist/i) && k.hours.length > 0, "Doctors and timings found.", "Patients can't see which doctor is available when.")];
    case "coaching":
      return [c("Courses and batches", mentions(k, /course|batch|program/i), "Courses found.", "No clear list of courses and batch timings.")];
    case "fitness":
      return [c("Plans and timings", k.prices.length > 0 || mentions(k, /membership|plan/i), "Plans found.", "No membership plans or timings shown.")];
    default:
      return [];
  }
}
function score(checks) {
  if (!checks.length) return 0;
  const pts = checks.reduce((s, c) => s + (c.ok === true ? 1 : c.ok === "partial" ? 0.5 : 0), 0);
  return Math.round((pts / checks.length) * 100);
}
const level = (s) => (s >= 75 ? "good" : s >= 45 ? "warn" : "bad");
export function auditBusiness(scan, answers, up = {}) {
  const k = scan.knowledge;
  const sig = k.signals;
  const p = profileOf(k);
  const goal = p.goal;
  const quickNames = { call: "Call", whatsapp: "WhatsApp", directions: "Directions", goal: goal.short };
  const hasChat = k.embeds.some((e) => /chat|widget/i.test(e));
  const hasBookingTool = k.embeds.some((e) => /booking|appointments/i.test(e));
  const hasBookingForm = k.forms.some((f) => f.purpose === "booking");
  const hasForm = k.forms.some((f) => f.purpose !== "newsletter");
  const contactCount = k.phones.length + k.whatsapp.length + k.emails.length;
  const knowledgeItems = k.prices.length + k.faqs.length + (k.hours.length ? 3 : 0) + (k.address ? 2 : 0);
  const websiteOnlyInstagram = !hasOwnWebsite(k);
  const localTypes = /LocalBusiness|Salon|Dentist|Clinic|Medical|Restaurant|Store|School|Organization|HealthClub|Physician|Cafe|Hotel|Business/i;
  const hasSchema = (sig?.jsonLdTypes ?? []).some((t) => localTypes.test(t));
  const hasFaqSchema = (sig?.jsonLdTypes ?? []).some((t) => /FAQPage/i.test(t));
  // ---------------------------------------------------------------- Website
  const website = up.website
    ? [
        ...(websiteOnlyInstagram ? [{ label: "Has a website", ok: true, detail: "Weblyy built one from your Instagram and business details." }] : []),
        { label: "Secure (HTTPS)", ok: true, detail: "The new website is served securely." },
        { label: "Mobile-first layout", ok: true, detail: "Designed for phones first, where most customers are." },
        { label: "Clear headline and business description", ok: true, detail: "Visitors know what you do in one glance." },
        { label: "Contact details up front", ok: true, detail: `${p.quick.map((q) => quickNames[q]).join(", ")} on every screen.` },
        { label: "Strong calls to action", ok: true, detail: `“${goal.cta}” is the main button, right where visitors look.` },
        {
          label: p.needs.prices ? "Services and prices easy to find" : "Services easy to find",
          ok: k.prices.length > 0 || k.services.length > 0 ? true : "partial",
          detail: k.prices.length ? `${k.prices.length} prices laid out clearly.` : k.services.length ? `${k.services.length} services laid out clearly.` : "Add your services to show them here.",
        },
        ...typeChecks(p, k, true),
      ]
    : [
        {
          label: "Has a website",
          ok: !websiteOnlyInstagram,
          detail: websiteOnlyInstagram ? "You don't have a website yet, only Instagram. Customers searching Google can't find you." : `${k.pages.length} pages read.`,
        },
        { label: "Secure (HTTPS)", ok: sig ? sig.https : false, detail: sig?.https ? "Served over HTTPS." : "Not served over HTTPS. Browsers warn visitors." },
        {
          label: "Mobile-friendly",
          ok: sig ? sig.viewport : false,
          detail: sig?.viewport ? "Has a mobile viewport." : "No mobile viewport. Pages may look tiny on phones.",
        },
        {
          label: "Clear headline",
          ok: sig?.h1 ? (sig.h1.length > 6 ? true : "partial") : false,
          detail: sig?.h1 ? `“${sig.h1.slice(0, 60)}”` : "No main headline (H1) on the homepage.",
        },
        {
          label: "Contact details visible",
          ok: contactCount >= 2 ? true : contactCount === 1 ? "partial" : false,
          detail: `${contactCount} ways to contact found.`,
        },
        {
          label: "Calls to action",
          ok: (sig?.ctaCount ?? 0) >= 3 ? true : (sig?.ctaCount ?? 0) > 0 ? "partial" : false,
          detail: `${sig?.ctaCount ?? 0} clear buttons found (like ${goal.short}, Call or Contact).`,
        },
        p.needs.prices
          ? {
              label: "Services and prices listed",
              ok: k.prices.length >= 5 ? true : k.prices.length > 0 || k.services.length > 2 ? "partial" : false,
              detail: k.prices.length ? `${k.prices.length} prices published.` : "No prices on the site.",
            }
          : {
              label: "Services listed",
              ok: k.services.length > 2 || k.prices.length > 0 ? true : k.services.length ? "partial" : false,
              detail: k.services.length ? `${k.services.length} services found.` : "What you offer isn't clearly listed.",
            },
        ...typeChecks(p, k, false),
      ];
  // ------------------------------------------------------ AI Customer Agent
  const agent = [
    {
      label: "AI Customer Agent on the site",
      ok: up.agent ? true : hasChat ? "partial" : false,
      detail: up.agent
        ? "Live on the website, chat link and QR code."
        : hasChat
          ? "A basic chat widget exists, but it needs a human to answer."
          : "No agent. Every question waits for a person.",
    },
    {
      label: "Answers after closing time",
      ok: up.agent || answers.afterHours === "yes" ? true : answers.afterHours === "sometimes" ? "partial" : false,
      detail: up.agent ? "Replies in seconds, 24/7." : "Late-evening messages wait until morning.",
    },
    {
      label: "Knows your business",
      ok: knowledgeItems >= 12 ? true : knowledgeItems >= 4 ? "partial" : false,
      detail: `${k.prices.length} prices, ${k.faqs.length} FAQs${k.hours.length ? ", opening hours" : ""}${k.address ? ", address" : ""} available to answer from.`,
    },
    { label: "Speaks the customer's language", ok: up.agent ? true : false, detail: up.agent ? "English and Hinglish." : "Not set up yet." },
    {
      label: "Hands tricky chats to the owner",
      ok: up.agent ? true : answers.replier === "staff" ? "partial" : false,
      detail: up.agent ? "Complaints and sensitive questions go to the owner inbox." : "No escalation path.",
    },
  ];
  // ------------------------------------------------------------ Lead capture
  const leads = [
    {
      label: `${goal.title} form`,
      ok: up.website || (goal.id === "booking" ? hasBookingForm || hasBookingTool : hasForm) ? true : hasForm ? "partial" : false,
      detail: up.website ? `“${goal.cta}” form on the new website.` : hasForm ? `${k.forms.length} form(s) found.` : `No way to ${goal.cta.toLowerCase()} on the site.`,
    },
    p.quick.includes("whatsapp")
      ? {
          label: "WhatsApp click-to-chat",
          ok: k.whatsapp.length > 0 || up.website ? true : false,
          detail: k.whatsapp.length ? "WhatsApp link found." : "No WhatsApp link.",
        }
      : {
          label: "Directions and phone",
          ok: ((k.address || k.mapUrl) && k.phones.length) || up.website ? true : k.address || k.mapUrl || k.phones.length ? "partial" : false,
          detail: (k.address || k.mapUrl) && k.phones.length ? "Map and phone found." : "Visitors can't easily call or find you.",
        },
    p.agent.mode === "full"
      ? {
          label: "Agent collects contact details",
          ok: up.agent ? true : false,
          detail: up.agent ? "Asks for name and number when a customer shows interest." : "Interested visitors leave without a trace.",
        }
      : {
          label: "Owner alerted on new enquiries",
          ok: up.automations ? true : false,
          detail: up.automations ? "Every enquiry lands in the Lead Center with an alert." : "Enquiries sit in an inbox until someone checks.",
        },
    {
      label: "Leads are qualified",
      ok: up.leadCenter ? true : false,
      detail: up.leadCenter ? "Each lead gets an AI qualification score." : "No way to tell hot leads from browsers.",
    },
    {
      label: "Leads tracked in one place",
      ok: up.leadCenter ? true : hasForm ? "partial" : false,
      detail: up.leadCenter ? "Lead Center with status for every lead." : "Enquiries scattered across WhatsApp, calls and email.",
    },
  ];
  // ------------------------------------------------------ AI Search readiness
  const search = [
    {
      label: "Structured business data",
      ok: up.search || hasSchema ? true : false,
      detail: up.search
        ? "LocalBusiness structured data generated."
        : hasSchema
          ? `Found: ${sig.jsonLdTypes.join(", ")}`
          : "No structured data. AI assistants have to guess who you are.",
    },
    {
      label: "Meta description",
      ok: up.search || (sig?.metaDescription?.length ?? 0) > 50 ? true : sig?.metaDescription ? "partial" : false,
      detail: up.search ? "Written for search and AI summaries." : sig?.metaDescription ? `“${sig.metaDescription.slice(0, 70)}…”` : "Missing.",
    },
    {
      label: "Clear business description",
      ok: up.search || k.description.length > 60 ? true : k.description ? "partial" : false,
      detail: k.description ? `${k.description.length} characters.` : "No short description of what you do.",
    },
    {
      label: "FAQ content",
      ok: up.search ? true : k.faqs.length >= 4 ? (hasFaqSchema ? true : "partial") : k.faqs.length ? "partial" : false,
      detail: up.search ? "FAQs with structured data." : `${k.faqs.length} FAQs${k.faqs.length && !hasFaqSchema ? ", not marked up" : ""}.`,
    },
    { label: "Location", ok: k.address ? true : false, detail: k.address ? k.address.slice(0, 60) : "No address on the site." },
    { label: "Opening hours", ok: k.hours.length ? true : false, detail: k.hours[0] ?? "Not listed." },
    p.needs.prices
      ? {
          label: "Services and prices",
          ok: k.prices.length >= 5 ? true : k.prices.length || k.services.length ? "partial" : false,
          detail: k.prices.length ? `${k.prices.length} priced services.` : "Services not clearly listed.",
        }
      : {
          label: "What you offer",
          ok: k.services.length >= 3 || k.prices.length ? true : k.services.length ? "partial" : false,
          detail: k.services.length ? `${k.services.length} items listed.` : "What you offer isn't clearly listed.",
        },
    { label: "Contact details", ok: contactCount >= 2 ? true : contactCount ? "partial" : false, detail: `${contactCount} contact methods.` },
    ...presenceChecks(scan.presence),
  ];
  // -------------------------------------------------------------- Automation
  const automation = [
    {
      label: "Instant replies to common questions",
      ok: up.agent ? true : hasChat ? "partial" : false,
      detail: up.agent ? "Price, timing and location questions answered automatically." : "Every reply is typed by hand.",
    },
    ...(goal.id !== "enquiry" && goal.id !== "quote"
      ? [
          {
            label: `${goal.requests} handled`,
            ok: up.automations || (goal.id === "booking" && hasBookingTool) ? true : hasBookingForm || hasForm ? "partial" : false,
            detail: up.automations
              ? "Requests arrive in one place and the owner confirms in one tap."
              : goal.id === "booking" && hasBookingTool
                ? "Booking tool found."
                : "Requests come in over calls and chats.",
          },
        ]
      : []),
    {
      label: "Lead follow-up",
      ok: up.automations ? true : false,
      detail: up.automations ? "Follow-up drafted for every new lead." : "No follow-up. Leads go cold.",
    },
    ...(p.needs.booking
      ? [
          {
            label: "Appointment reminders",
            ok: answers.reminders === "automated" ? true : answers.reminders === "manual" ? "partial" : false,
            detail: answers.reminders === "automated" ? "Already automatic." : answers.reminders === "manual" ? "Sent by hand." : "No reminders.",
          },
        ]
      : []),
    {
      label: "Owner alerts",
      ok: up.automations ? true : false,
      detail: up.automations ? "Owner inbox flags anything that needs a person." : "Urgent messages get lost in the pile.",
    },
  ];
  const cats = [
    mk(p, "website", "Website", website, {
      good: "The website does its job.",
      warn: "The website works, but it isn't built to convert.",
      bad: "The website is holding the business back.",
    }),
    mk(p, "agent", p.agent.mode === "full" ? "AI Customer Agent" : "AI Assistant (optional)", agent, {
      good: "Customers get instant, accurate answers.",
      warn: "Some answers are available, but nobody gives them instantly.",
      bad: "No AI agent. Every question waits for a person.",
    }),
    mk(p, "leads", "Lead Capture", leads, {
      good: "Interested visitors become tracked leads.",
      warn: "Some enquiries are captured, most aren't tracked.",
      bad: "Interested visitors leave without a trace.",
    }),
    mk(p, "search", "AI Search Readiness", search, {
      good: "AI assistants and search engines can understand this business.",
      warn: "Partly understandable to AI search. Key facts are missing or unstructured.",
      bad: "Hard for AI assistants and search to understand this business.",
    }),
    mk(p, "automation", "Automation", automation, {
      good: "Routine work runs by itself.",
      warn: "A few things are automated. Most still depend on the owner.",
      bad: "Everything depends on someone remembering.",
    }),
  ];
  const total = Math.round(cats.reduce((s, c) => s + c.score * p.weights[c.key], 0));
  // One problem per category first, then the rest, so the list covers every weak area.
  // Areas that barely matter for this kind of business (e.g. automation for a school) don't get listed as problems.
  const failing = [...cats].filter((c) => p.weights[c.key] >= 0.1).sort((a, b) => p.weights[b.key] - p.weights[a.key]).map((c) => c.checks.filter((x) => x.ok === false).map((x) => `${x.label}: ${x.detail}`));
  const problems = [...failing.map((f) => f[0]).filter(Boolean), ...failing.flatMap((f) => f.slice(1))].slice(0, 6);
  // Lead with what matters most for this kind of business.
  const opportunities = [...cats]
    .sort((a, b) => p.weights[b.key] - p.weights[a.key])
    .filter((c) => p.weights[c.key] >= 0.1 && c.recommendations.length)
    .flatMap((c) => c.recommendations.slice(0, 2))
    .slice(0, 5);
  return { score: total, categories: cats, problems, opportunities };
}
/** Web search checks. Skipped when the search didn't run, so a failed search never lowers the score. */
function presenceChecks(p) {
  if (!p?.searched) return [];
  const maps = p.listings.find((l) => l.platform === "Google Maps");
  const dirs = p.listings.filter((l) => !["Instagram", "Facebook", "YouTube", "LinkedIn", "X", "Wikipedia", "Reddit", "Quora"].includes(l.platform));
  const rated = p.listings.filter((l) => l.rating).sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0));
  return [
    {
      label: "Found when searched by name",
      ok: p.ownSiteFound ? true : p.listings.length ? "partial" : false,
      detail: p.ownSiteFound
        ? `Your site shows up for “${p.query}”.`
        : p.listings.length
          ? `Only other sites show up for “${p.query}”.`
          : `Nothing about you shows up for “${p.query}”.`,
    },
    {
      label: "Listed on maps and directories",
      ok: dirs.length >= 3 ? true : dirs.length ? "partial" : false,
      detail: dirs.length
        ? `${dirs.map((d) => d.platform).join(", ")}${maps ? "" : ". Not seen on Google Maps"}.`
        : "Not found on Google Maps, Justdial or other directories.",
    },
    {
      label: "Ratings and reviews online",
      ok: rated.some((l) => (l.rating ?? 0) >= 4) ? true : rated.length ? "partial" : false,
      detail: rated.length
        ? rated
            .slice(0, 3)
            .map((l) => `${l.rating}★ on ${l.platform}${l.reviews ? ` (${l.reviews})` : ""}`)
            .join(", ")
        : "No ratings found in search results.",
    },
  ];
}
function mk(p, key, label, checks, summaries) {
  const s = score(checks);
  const lv = level(s);
  return { key, label, score: s, level: lv, weight: p.weights[key], summary: summaries[lv], checks, recommendations: recommend(p, key, checks) };
}
function recommend(p, key, checks) {
  const goal = p.goal;
  const missing = (label) => checks.find((c) => c.label === label && c.ok !== true);
  const out = [];
  switch (key) {
    case "website":
      if (missing("Has a website")) out.push("You don't have a website yet. Weblyy builds one for you from your Instagram, so customers can find you on Google.");
      if (missing("Mobile-friendly") || missing("Calls to action") || missing("Clear headline"))
        out.push(`Rebuild the website for phones, with a clear headline and the “${goal.cta}” button where visitors look first.`);
      if (missing("Services and prices listed")) out.push("List your services with prices so customers stop asking “kitne ka hai?”.");
      if (missing("Services listed")) out.push("List what you offer clearly on the homepage.");
      if (missing("Admissions information") || missing("Fee structure")) out.push("Put admission steps, dates and the fee structure on the site so parents don't have to call.");
      if (missing("Facilities and notices")) out.push("Show facilities, transport and the latest notices so parents trust what they see.");
      if (missing("Menu online")) out.push("Put your menu online with prices.");
      if (missing("Products shown")) out.push("Show your main products with photos and prices.");
      if (missing("Doctors and timings")) out.push("Show each doctor with their specialty and consultation timings.");
      if (missing("Courses and batches")) out.push("List courses with batch timings and fees.");
      if (missing("Plans and timings")) out.push("Show membership plans and gym timings.");
      if (missing("Secure (HTTPS)")) out.push("Serve the site over HTTPS so browsers don't warn visitors.");
      break;
    case "agent":
      if (missing("AI Customer Agent on the site"))
        out.push(
          p.agent.mode === "full"
            ? "Add an AI Customer Agent that answers from your own website, 24/7, in English and Hinglish."
            : "Optional: an assistant that answers common questions (timings, fees, location) from your own website.",
        );
      if (missing("Knows your business")) out.push("Publish prices, timings and FAQs so the agent can answer more on its own.");
      break;
    case "leads":
      if (missing("Agent collects contact details")) out.push("Let the agent collect name and number from interested customers automatically.");
      if (missing("Leads tracked in one place")) out.push("Track every enquiry in one Lead Center with a status and an AI qualification.");
      if (missing(`${goal.title} form`)) out.push(`Add a short “${goal.cta}” form. Name and phone are enough.`);
      if (missing("Directions and phone")) out.push("Show your phone number and a map link on every page.");
      break;
    case "search":
      if (missing("Structured business data"))
        out.push("Add LocalBusiness structured data so AI assistants and search engines can read your name, services, hours and location.");
      if (missing("Meta description") || missing("Clear business description"))
        out.push("Write a clear one-paragraph business description and meta description.");
      if (missing("FAQ content")) out.push("Publish FAQs (with FAQ structured data) answering what customers ask most.");
      if (missing("Location") || missing("Opening hours")) out.push("Show your address and opening hours in plain text on the site.");
      if (missing("Listed on maps and directories"))
        out.push("Claim your Google Business Profile and Justdial listing with the same name, address and phone as your site.");
      if (missing("Ratings and reviews online")) out.push("Ask happy customers for Google reviews.");
      break;
    case "automation":
      if (missing("Instant replies to common questions")) out.push("Automate replies to price, timing and location questions.");
      if (missing("Lead follow-up")) out.push("Draft a follow-up for every new lead so none go cold.");
      if (missing(`${goal.requests} handled`)) out.push(`Collect “${goal.cta}” requests in one place and confirm them in one tap.`);
      break;
  }
  return out;
}
