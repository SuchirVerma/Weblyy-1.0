export const AREAS = [
  { key: "design", label: "Design", blurb: "Visual hierarchy, brand, photos" },
  { key: "ux", label: "UX", blurb: "Navigation, links, forms, accessibility" },
  { key: "mobile", label: "Mobile", blurb: "How it works on a phone" },
  { key: "content", label: "Content", blurb: "What a customer needs to know" },
  { key: "seo", label: "SEO", blurb: "How search engines read it" },
  { key: "performance", label: "Performance", blurb: "Speed and page weight" },
  { key: "conversion", label: "CTA / Conversion", blurb: "Turning visitors into enquiries" },
  { key: "features", label: "Missing features", blurb: "What customers expect to find" },
];
const kb = (b) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1000)} KB`);
const sec = (ms) => `${(ms / 1000).toFixed(1)} s`;
const n = (x, one, many = `${one}s`) => `${x} ${x === 1 ? one : many}`;
const GENERIC_HEADLINE = /^(welcome|home|hello|hi|about us|homepage|welcome to (our|the) (website|site))\b/i;
const LOCAL_SCHEMA = /LocalBusiness|Salon|Dentist|Clinic|Medical|Restaurant|Store|School|Organization|HealthClub|Physician|Cafe|Hotel|Business/i;
const hasChat = (f) => f.k.embeds.some((e) => /chat|widget/i.test(e));
const hasBooking = (f) => f.k.embeds.some((e) => /booking|appointments/i.test(e)) || f.k.forms.some((x) => x.purpose === "booking");
const enquiryForms = (f) => f.k.forms.filter((x) => x.purpose !== "newsletter").length;
const RULES = [
  // ------------------------------------------------------------------ Design
  {
    id: "d-h1",
    area: "design",
    label: "One clear main headline",
    improve: "Layout",
    run: (f) => {
      const c = f.signals.h1Count ?? (f.signals.h1 ? 1 : 0);
      return {
        ok: c === 1 ? true : c > 1 ? "partial" : false,
        detail:
          c === 1
            ? `“${f.signals.h1.slice(0, 70)}”`
            : c > 1
              ? `${c} main headlines compete for attention.`
              : "No main headline, so nothing tells the eye where to start.",
      };
    },
  },
  {
    id: "d-headings",
    area: "design",
    label: "Headings in a logical order",
    improve: "Layout",
    run: (f) => {
      const s = f.signals.headingSkips;
      if (s === undefined) return null;
      return {
        ok: s === 0 ? true : s <= 2 ? "partial" : false,
        detail: s === 0 ? "Sections step down cleanly from the main headline." : `Heading levels jump ${n(s, "time")}, which flattens the page's structure.`,
      };
    },
  },
  {
    id: "d-fonts",
    area: "design",
    label: "Consistent typography",
    improve: "Typography",
    run: (f) => {
      const fonts = f.desktop?.fonts;
      if (!fonts) return null;
      return {
        ok: fonts.length <= 3 ? true : fonts.length <= 5 ? "partial" : false,
        detail: fonts.length <= 3 ? `${fonts.join(", ")}.` : `${fonts.length} different fonts: ${fonts.slice(0, 5).join(", ")}.`,
      };
    },
  },
  {
    id: "d-brand",
    area: "design",
    label: "Recognisable brand",
    improve: "UI/UX",
    run: (f) => ({ ok: f.logo ? true : "partial", detail: f.logo ? "Logo shown at the top." : "No logo found, only the name." }),
  },
  {
    id: "d-photos",
    area: "design",
    label: "Real photos",
    improve: "UI/UX",
    run: (f) => ({
      ok: f.images >= 3 ? true : f.images ? "partial" : false,
      detail: f.images ? `${n(f.images, "photo")} of the business.` : "No photos of the place, the team or the work.",
    }),
  },
  {
    id: "d-broken",
    area: "design",
    label: "No broken images",
    improve: "UI/UX",
    run: (f) => {
      const b = f.desktop?.brokenImages;
      if (b === undefined) return null;
      return { ok: b === 0, detail: b === 0 ? "Every image loads." : `${n(b, "image")} fail to load.` };
    },
  },
  // ---------------------------------------------------------------------- UX
  {
    id: "u-nav",
    area: "ux",
    label: "Simple navigation",
    improve: "UI/UX",
    run: (f) => {
      const c = f.signals.navCount;
      if (c === undefined) return null;
      return {
        ok: c >= 2 && c <= 8 ? true : c > 8 ? "partial" : false,
        detail: c > 8 ? `${c} menu links. Visitors have to hunt for what they need.` : c >= 2 ? `${c} menu links.` : "No menu to move around the site.",
      };
    },
  },
  {
    id: "u-contact-home",
    area: "ux",
    label: "Contact details on the first page",
    improve: "Conversion flow",
    run: (f) => {
      const c = f.signals.contactLinks;
      if (c === undefined) return null;
      return {
        ok: c >= 2 ? true : c === 1 ? "partial" : false,
        detail: c ? `${n(c, "tap-to-contact link")} on the homepage.` : "No tap-to-call, WhatsApp or email link on the homepage.",
      };
    },
  },
  {
    id: "u-links",
    area: "ux",
    label: "Links say where they go",
    improve: "Accessibility",
    run: (f) => {
      const v = f.desktop?.vagueLinks;
      if (v === undefined) return null;
      return {
        ok: v === 0 ? true : v <= 3 ? "partial" : false,
        detail: v === 0 ? "No “click here” links." : `${n(v, "link")} just say “click here” or “read more”.`,
      };
    },
  },
  {
    id: "u-labels",
    area: "ux",
    label: "Form fields are labelled",
    improve: "Accessibility",
    run: (f) => {
      const u = f.desktop?.unlabeledInputs;
      if (u === undefined || (u === 0 && !enquiryForms(f))) return null;
      return { ok: u === 0, detail: u === 0 ? "Every field has a label." : `${n(u, "field")} rely on placeholder text only. Screen readers can't name them.` };
    },
  },
  {
    id: "u-alt",
    area: "ux",
    label: "Images described for screen readers",
    improve: "Accessibility",
    run: (f) => {
      const m = f.desktop;
      if (!m || !m.images) return null;
      const r = m.imagesNoAlt / m.images;
      return {
        ok: m.imagesNoAlt === 0 ? true : r < 0.3 ? "partial" : false,
        detail: m.imagesNoAlt ? `${m.imagesNoAlt} of ${m.images} images have no description.` : "Every image has a description.",
      };
    },
  },
  // ------------------------------------------------------------------ Mobile
  {
    id: "m-viewport",
    area: "mobile",
    label: "Built for phone screens",
    improve: "Mobile experience",
    run: (f) => ({
      ok: f.signals.viewport,
      detail: f.signals.viewport ? "Has a mobile viewport." : "No mobile viewport. Phones show a shrunken desktop page.",
    }),
  },
  {
    id: "m-overflow",
    area: "mobile",
    label: "No sideways scrolling",
    improve: "Mobile experience",
    run: (f) =>
      f.mobile
        ? { ok: !f.mobile.overflowX, detail: f.mobile.overflowX ? "The page is wider than a phone screen and wobbles sideways." : "Fits the screen." }
        : null,
  },
  {
    id: "m-text",
    area: "mobile",
    label: "Readable text size",
    improve: "Typography",
    run: (f) => {
      const s = f.mobile?.smallText;
      if (s === undefined) return null;
      return {
        ok: s === 0 ? true : s <= 12 ? "partial" : false,
        detail: s === 0 ? "No text smaller than 12px." : `${n(s, "block")} of text smaller than 12px on a phone.`,
      };
    },
  },
  {
    id: "m-taps",
    area: "mobile",
    label: "Buttons easy to tap",
    improve: "Mobile experience",
    run: (f) => {
      const s = f.mobile?.smallTargets;
      if (s === undefined) return null;
      return {
        ok: s <= 2 ? true : s <= 12 ? "partial" : false,
        detail: s <= 2 ? "Buttons and links are finger-sized." : `${n(s, "button or link", "buttons and links")} smaller than 32px. Easy to mis-tap.`,
      };
    },
  },
  {
    id: "m-cta",
    area: "mobile",
    label: "Action button on the first phone screen",
    improve: "CTAs",
    run: (f) => {
      const c = f.mobile?.ctaAboveFold;
      if (!c) return null;
      return {
        ok: c.length > 0,
        detail: c.length ? `“${c.slice(0, 3).join("”, “")}”` : "A phone visitor has to scroll before they can call, book or message.",
      };
    },
  },
  {
    id: "m-sticky",
    area: "mobile",
    label: "Contact always within reach",
    improve: "Conversion flow",
    run: (f) =>
      f.mobile
        ? {
            ok: f.mobile.stickyContact,
            detail: f.mobile.stickyContact ? "A call / chat button stays on screen while scrolling." : "Once visitors scroll, the contact buttons are gone.",
          }
        : null,
  },
  // ----------------------------------------------------------------- Content
  {
    id: "c-headline",
    area: "content",
    label: "Headline says who you are",
    improve: "Content structure",
    run: (f) => {
      const h = f.headline;
      return {
        ok: h && !GENERIC_HEADLINE.test(h) && h.length >= 6 ? true : h ? "partial" : false,
        detail: h ? `“${h.slice(0, 70)}”` : "No headline on the homepage.",
      };
    },
  },
  {
    id: "c-desc",
    area: "content",
    label: "Short description of the business",
    improve: "Content structure",
    run: (f) => {
      const ok = f.k.description.length >= 50 || f.about > 0;
      return {
        ok: ok ? true : f.k.description ? "partial" : false,
        detail: ok ? (f.about ? `${n(f.about, "paragraph")} about the business.` : "Has a short summary.") : "No short summary of what the business does.",
      };
    },
  },
  {
    id: "c-services",
    area: "content",
    label: "Services listed",
    improve: "Content structure",
    run: (f) => {
      const c = Math.max(f.k.prices.length, f.k.services.length);
      return { ok: c >= 3 ? true : c ? "partial" : false, detail: c ? `${n(c, "service")}.` : "Services aren't listed anywhere." };
    },
  },
  {
    id: "c-prices",
    area: "content",
    label: "Prices published",
    improve: "Content structure",
    run: (f) => ({
      ok: f.k.prices.length >= 5 ? true : f.k.prices.length ? "partial" : false,
      detail: f.k.prices.length ? `${n(f.k.prices.length, "price")}.` : "No prices on the website.",
    }),
  },
  {
    id: "c-hours",
    area: "content",
    label: "Opening hours",
    improve: "Content structure",
    run: (f) => ({ ok: f.k.hours.length > 0, detail: f.k.hours[0] ?? "Opening hours aren't on the website." }),
  },
  {
    id: "c-address",
    area: "content",
    label: "Address",
    improve: "Content structure",
    run: (f) => ({ ok: Boolean(f.k.address), detail: f.k.address ? f.k.address.slice(0, 70) : "No address on the website." }),
  },
  {
    id: "c-proof",
    area: "content",
    label: "Reviews or testimonials",
    improve: "Content structure",
    run: (f) => ({
      ok: f.testimonials > 0 || f.rating ? true : false,
      detail: f.testimonials ? `${n(f.testimonials, "testimonial")}.` : f.rating ? "Online rating shown." : "No reviews or testimonials on the website.",
    }),
  },
  {
    id: "c-faq",
    area: "content",
    label: "Answers to common questions",
    improve: "Content structure",
    run: (f) => ({
      ok: f.k.faqs.length >= 3 ? true : f.k.faqs.length ? "partial" : false,
      detail: f.k.faqs.length ? `${n(f.k.faqs.length, "question")} answered.` : "No FAQ section.",
    }),
  },
  // --------------------------------------------------------------------- SEO
  {
    id: "s-https",
    area: "seo",
    label: "Secure (HTTPS)",
    improve: "SEO",
    run: (f) => ({ ok: f.signals.https, detail: f.signals.https ? "Served over HTTPS." : "Not secure. Browsers warn visitors." }),
  },
  {
    id: "s-title",
    area: "seo",
    label: "Page title",
    improve: "SEO",
    run: (f) => {
      const t = f.signals.title;
      return {
        ok: t.length >= 10 && t.length <= 65 ? true : t ? "partial" : false,
        detail: t ? `“${t.slice(0, 70)}” (${t.length} characters)` : "No page title.",
      };
    },
  },
  {
    id: "s-meta",
    area: "seo",
    label: "Meta description",
    improve: "SEO",
    run: (f) => {
      const m = f.signals.metaDescription;
      return {
        ok: m.length >= 50 && m.length <= 170 ? true : m ? "partial" : false,
        detail: m ? `${m.length} characters.` : "Missing. Google makes up its own snippet.",
      };
    },
  },
  {
    id: "s-schema",
    area: "seo",
    label: "Structured business data",
    improve: "SEO",
    run: (f) => {
      const t = f.signals.jsonLdTypes.filter((x) => LOCAL_SCHEMA.test(x) || /FAQPage/.test(x));
      return { ok: t.length ? true : false, detail: t.length ? t.join(", ") : "None. Search engines and AI assistants have to guess who you are." };
    },
  },
  {
    id: "s-social",
    area: "seo",
    label: "Link previews (Open Graph)",
    improve: "SEO",
    run: (f) => ({
      ok: f.signals.ogImage && f.signals.ogTitle ? true : f.signals.ogImage || f.signals.ogTitle ? "partial" : false,
      detail:
        f.signals.ogImage && f.signals.ogTitle
          ? "Shared links show a title and image."
          : f.signals.ogTitle
            ? "Shared links show a title, but no image (no photo to use)."
            : f.signals.ogImage
              ? "Shared links show an image, but no title."
              : "Links shared on WhatsApp show a bare URL.",
    }),
  },
  {
    id: "s-lang",
    area: "seo",
    label: "Page language declared",
    improve: "Accessibility",
    run: (f) =>
      f.signals.lang === undefined
        ? null
        : { ok: Boolean(f.signals.lang), detail: f.signals.lang ? `lang="${f.signals.lang}"` : "Not declared. Screen readers may use the wrong voice." },
  },
  {
    id: "s-canonical",
    area: "seo",
    label: "Canonical address",
    improve: "SEO",
    run: (f) =>
      f.signals.canonical === undefined
        ? null
        : { ok: f.signals.canonical, detail: f.signals.canonical ? "Set." : "Not set, so duplicate URLs split ranking." },
  },
  // ------------------------------------------------------------- Performance
  {
    id: "p-load",
    area: "performance",
    label: "Loads quickly on a laptop",
    improve: "Performance",
    run: (f) =>
      f.desktop ? { ok: f.desktop.loadMs < 3000 ? true : f.desktop.loadMs < 7000 ? "partial" : false, detail: `Loaded in ${sec(f.desktop.loadMs)}.` } : null,
  },
  {
    id: "p-mobile",
    area: "performance",
    label: "Loads quickly on a phone",
    improve: "Performance",
    run: (f) =>
      f.mobile ? { ok: f.mobile.loadMs < 4000 ? true : f.mobile.loadMs < 9000 ? "partial" : false, detail: `Loaded in ${sec(f.mobile.loadMs)}.` } : null,
  },
  {
    id: "p-weight",
    area: "performance",
    label: "Light page",
    improve: "Performance",
    run: (f) =>
      f.desktop?.bytes
        ? { ok: f.desktop.bytes < 2.5e6 ? true : f.desktop.bytes < 6e6 ? "partial" : false, detail: `${kb(f.desktop.bytes)} downloaded.` }
        : null,
  },
  {
    id: "p-requests",
    area: "performance",
    label: "Few files to fetch",
    improve: "Performance",
    run: (f) =>
      f.desktop?.requests
        ? { ok: f.desktop.requests < 80 ? true : f.desktop.requests < 160 ? "partial" : false, detail: `${f.desktop.requests} files.` }
        : null,
  },
  // ---------------------------------------------------------- CTA / Conversion
  {
    id: "x-fold",
    area: "conversion",
    label: "Clear next step on the first screen",
    improve: "CTAs",
    run: (f) =>
      f.desktop
        ? {
            ok: f.desktop.ctaAboveFold.length > 0,
            detail: f.desktop.ctaAboveFold.length
              ? `“${f.desktop.ctaAboveFold.slice(0, 3).join("”, “")}”`
              : "No Book, Call or Contact button before the visitor scrolls.",
          }
        : null,
  },
  {
    id: "x-count",
    area: "conversion",
    label: "Calls to action through the page",
    improve: "CTAs",
    run: (f) => ({ ok: f.signals.ctaCount >= 3 ? true : f.signals.ctaCount ? "partial" : false, detail: `${n(f.signals.ctaCount, "action button")}.` }),
  },
  {
    id: "x-form",
    area: "conversion",
    label: "Enquiry form",
    improve: "Conversion flow",
    run: (f) => {
      const c = enquiryForms(f);
      return { ok: c > 0, detail: c ? `${n(c, "form")} to leave details.` : "No way to leave a name and number." };
    },
  },
  {
    id: "x-wa",
    area: "conversion",
    label: "WhatsApp click-to-chat",
    improve: "Conversion flow",
    run: (f) => ({ ok: f.k.whatsapp.length > 0, detail: f.k.whatsapp.length ? "WhatsApp link." : "No WhatsApp link." }),
  },
  {
    id: "x-call",
    area: "conversion",
    label: "Tap to call",
    improve: "Conversion flow",
    run: (f) => ({ ok: f.k.phones.length > 0, detail: f.k.phones.length ? "Phone number." : "No phone number." }),
  },
  // -------------------------------------------------------- Missing features
  {
    id: "f-chat",
    area: "features",
    label: "Instant answers (chat)",
    improve: "Conversion flow",
    run: (f) => ({ ok: hasChat(f), detail: hasChat(f) ? "Chat on the page." : "Questions wait until someone is free." }),
  },
  {
    id: "f-booking",
    area: "features",
    label: "Booking or appointment request",
    improve: "Conversion flow",
    run: (f) => ({
      ok: hasBooking(f) ? true : enquiryForms(f) ? "partial" : false,
      detail: hasBooking(f) ? "Booking request available." : enquiryForms(f) ? "Only a general contact form." : "Bookings only by phone.",
    }),
  },
  {
    id: "f-map",
    area: "features",
    label: "Map and directions",
    improve: "UI/UX",
    run: (f) => ({
      ok: Boolean(f.k.mapUrl) || f.k.embeds.includes("Google Maps") ? true : f.k.address ? "partial" : false,
      detail:
        f.k.mapUrl || f.k.embeds.includes("Google Maps") ? "Directions link." : f.k.address ? "Address only, no directions link." : "No map or directions.",
    }),
  },
  {
    id: "f-social",
    area: "features",
    label: "Social profiles linked",
    improve: "UI/UX",
    run: (f) => ({
      ok: f.k.socialLinks.length > 0,
      detail: f.k.socialLinks.length ? f.k.socialLinks.map((s) => s.name).join(", ") : "No links to Instagram, Facebook or others.",
    }),
  },
  {
    id: "f-email",
    area: "features",
    label: "Email contact",
    improve: "Conversion flow",
    run: (f) => ({ ok: f.k.emails.length > 0, detail: f.k.emails[0] ?? "No email address." }),
  },
];
function scoreOf(checks) {
  if (!checks.length) return 0;
  const pts = checks.reduce((s, c) => s + (c.ok === true ? 1 : c.ok === "partial" ? 0.5 : 0), 0);
  return Math.round((pts / checks.length) * 100);
}
export function auditSite(f, only) {
  const checks = [];
  for (const r of RULES) {
    if (only && !only.has(r.id)) continue;
    const res = r.run(f);
    if (res) checks.push({ id: r.id, area: r.area, label: r.label, ...res });
  }
  const areas = AREAS.map((a) => {
    const cs = checks.filter((c) => c.area === a.key);
    return { key: a.key, label: a.label, score: scoreOf(cs), checks: cs };
  }).filter((a) => a.checks.length);
  return { score: Math.round(areas.reduce((s, a) => s + a.score, 0) / Math.max(1, areas.length)), areas, measured: Boolean(f.desktop || f.mobile) };
}
export function factsFor(k, capture, rating) {
  const c = k.content;
  const images = new Set([...(c?.images ?? []).map((i) => i.src), ...(capture?.brand.images ?? []).map((i) => i.src)]);
  return {
    url: k.url,
    signals: k.signals ?? {
      https: k.url.startsWith("https:"),
      viewport: false,
      title: "",
      h1: "",
      metaDescription: "",
      jsonLdTypes: [],
      ctaCount: 0,
      ogImage: false,
      wordCount: 0,
    },
    k,
    headline: c?.headline ?? k.signals?.h1 ?? "",
    about: c?.about.length ?? 0,
    testimonials: c?.testimonials.length ?? 0,
    images: images.size,
    logo: Boolean(c?.logo || capture?.brand.logo),
    rating,
    desktop: capture?.desktop ?? null,
    mobile: capture?.mobile ?? null,
  };
}
export const hasRating = (scan) => Boolean(scan.presence?.listings.some((l) => (l.rating ?? 0) > 0));
const TODO = {
  "c-prices": "Add your prices. We only show prices that are on your current site.",
  "c-hours": "Add your opening hours. We don't guess them.",
  "c-address": "Add your full address so customers and Google can find you.",
  "c-proof": "Share a few real customer reviews. We don't write testimonials.",
  "c-faq": "Send the questions customers ask most, with your answers.",
  "c-services": "List your services so the site can show them.",
  "d-photos": "Upload photos of the place, the team and your work.",
  "d-brand": "Upload your logo.",
  "x-wa": "Add a WhatsApp number so customers can message you in one tap.",
  "x-call": "Add a phone number for tap-to-call.",
  "f-email": "Add an email address.",
  "f-social": "Link your Instagram or Facebook page.",
  "f-map": "Add your address to show a directions button.",
  "c-desc": "Write two lines about what makes the business different.",
};
export function planMakeover(k, capture, before, after, brand) {
  const c = k.content;
  const keep = [];
  const add = (x) => keep.push(x);
  add({ group: "Business identity", label: "Business name", value: k.name });
  const logo = c?.logo || capture?.brand.logo;
  if (logo) add({ group: "Business identity", label: "Logo", value: "Your logo, unchanged", image: logo });
  const colors = capture?.brand.colors.length ? capture.brand.colors : c?.themeColor ? [c.themeColor] : [];
  if (colors.length)
    add({
      group: "Business identity",
      label: "Brand colours",
      value: `${colors.slice(0, 3).join(", ")} (main colour ${brand.accent})`,
      swatches: colors.slice(0, 3),
    });
  if (brand.headingFont) add({ group: "Business identity", label: "Brand font", value: brand.headingFont });
  if (c?.headline && !GENERIC_HEADLINE.test(c.headline)) add({ group: "Business identity", label: "Headline", value: `“${c.headline}”` });
  if (c?.subheadline) add({ group: "Business identity", label: "Tagline", value: `“${c.subheadline.slice(0, 140)}”` });
  if (k.prices.length) add({ group: "Services", label: "Price list", value: `${k.prices.length} services with prices, word for word` });
  else if (k.services.length)
    add({
      group: "Services",
      label: "Services",
      value: k.services.slice(0, 5).join(", ") + (k.services.length > 5 ? ` and ${k.services.length - 5} more` : ""),
    });
  if (k.faqs.length) add({ group: "Services", label: "FAQs", value: `${k.faqs.length} questions and answers` });
  if (c?.about.length)
    add({ group: "Brand information", label: "About the business", value: `${c.about.length} paragraph${c.about.length > 1 ? "s" : ""}, word for word` });
  if (c?.testimonials.length)
    add({ group: "Brand information", label: "Testimonials", value: `${c.testimonials.length} customer quote${c.testimonials.length > 1 ? "s" : ""}` });
  const photos = new Set([...(capture?.brand.images ?? []), ...(c?.images ?? [])].map((i) => i.src)).size;
  if (photos)
    add({
      group: "Brand information",
      label: "Photos",
      value: `${photos} photo${photos > 1 ? "s" : ""} from your site`,
      image: capture?.brand.images[0]?.src ?? c?.images[0]?.src,
    });
  if (c?.sections.length)
    add({
      group: "Brand information",
      label: "Section copy",
      value: c.sections
        .slice(0, 3)
        .map((s) => s.heading)
        .join(", "),
    });
  if (k.socialLinks.length) add({ group: "Brand information", label: "Social profiles", value: k.socialLinks.map((s) => s.name).join(", ") });
  for (const p of k.phones.slice(0, 2)) add({ group: "Contact details", label: "Phone", value: p });
  for (const w of k.whatsapp.filter((w) => /\d{8,}/.test(w)).slice(0, 1)) add({ group: "Contact details", label: "WhatsApp", value: w });
  for (const e of k.emails.slice(0, 2)) add({ group: "Contact details", label: "Email", value: e });
  if (k.address) add({ group: "Contact details", label: "Address", value: k.address });
  if (k.hours.length) add({ group: "Contact details", label: "Hours", value: k.hours.join(" · ") });
  const notFound = [];
  if (!k.prices.length) notFound.push("Prices");
  if (!k.hours.length) notFound.push("Opening hours");
  if (!k.address) notFound.push("Address");
  if (!k.phones.length && !k.whatsapp.length) notFound.push("Phone or WhatsApp number");
  if (!c?.testimonials.length) notFound.push("Customer reviews");
  if (!logo) notFound.push("Logo");
  const flat = (a) => a.areas.flatMap((x) => x.checks);
  const was = new Map(flat(before).map((x) => [x.id, x]));
  const improve = [];
  for (const x of flat(after)) {
    const b = was.get(x.id);
    const rule = RULES.find((r) => r.id === x.id);
    const better = x.ok === true ? b?.ok !== true : x.ok === "partial" && b?.ok === false;
    if (!better) continue;
    improve.push({ kind: rule.improve, area: x.area, label: x.label, before: b?.detail ?? "Not there.", after: x.detail });
  }
  const ownerTodo = flat(after)
    .filter((x) => x.ok !== true && TODO[x.id])
    .map((x) => ({ label: x.label, why: TODO[x.id] }));
  return { keep, notFound, improve, ownerTodo };
}
/* -------------------------------------------------------------- brand tokens */
function lum(hex) {
  const v = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
}
export const contrast = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};
function darken(hex, f) {
  return `#${[1, 3, 5]
    .map((i) =>
      Math.round(parseInt(hex.slice(i, i + 2), 16) * f)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}
const toHex = (c) => {
  const s = c.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(s)) return s;
  if (/^#[0-9a-f]{3}$/.test(s)) return `#${[1, 2, 3].map((i) => s[i] + s[i]).join("")}`;
  return "";
};
/** Fonts we can load from Google Fonts by name. Anything else falls back to the default pair. */
const GOOGLE_FONTS = new Set(
  "Poppins,Montserrat,Playfair Display,Lato,Open Sans,Roboto,Raleway,Nunito,Merriweather,Oswald,Inter,DM Sans,Cormorant Garamond,Cormorant,Lora,Josefin Sans,Mulish,Work Sans,Rubik,Karla,Manrope,Outfit,Jost,Libre Baskerville,EB Garamond,Marcellus,Cinzel,Great Vibes,Dancing Script,Quicksand,Nunito Sans,Source Sans 3,PT Serif,Crimson Text,Bebas Neue,Barlow,Kanit,Prata,Philosopher,Abril Fatface,Urbanist,Plus Jakarta Sans,Sora,Space Grotesk,Fraunces,Archivo,Figtree,Hind,Mukta,Noto Serif,Noto Sans,Tenor Sans,Italiana,Bodoni Moda,Syne".split(
    ",",
  ),
);
/** Serif fonts every device already has; kept because they carry the brand's feel. (System sans fonts like Arial are swapped for a sharper one.) */
export const SYSTEM_SERIFS = new Set(["Georgia", "Palatino", "Palatino Linotype", "Garamond", "Times New Roman", "Book Antiqua", "Baskerville"]);
const SCRIPT_FONTS = /Great Vibes|Dancing Script|Pacifico|Allura|Parisienne|Sacramento|Satisfy/i;
/**
 * The brand's own colour and fonts, made safe to use: the colour is darkened until white text on it
 * passes WCAG AA, and fonts are only used when they can be loaded and read at body size.
 */
export function brandTokens(k, capture, fallback) {
  const candidates = [...(capture?.brand.colors ?? []), toHex(k.content?.themeColor ?? "")].map(toHex).filter(Boolean);
  // The accent is the first colour that isn't near-black or pastel (dark browns and navies are usually text or header fills).
  let accent = candidates.find((c) => lum(c) > 0.05 && lum(c) < 0.55) || candidates[0] || fallback;
  const original = accent;
  for (let i = 0; i < 12 && contrast(accent, "#ffffff") < 4.6; i++) accent = darken(accent, 0.88);
  const h = capture?.brand.headingFont ?? "";
  const b = capture?.brand.bodyFont ?? "";
  const headingFont = GOOGLE_FONTS.has(h) || SYSTEM_SERIFS.has(h) ? h : "";
  const bodyFont = (GOOGLE_FONTS.has(b) || SYSTEM_SERIFS.has(b)) && !SCRIPT_FONTS.test(b) ? b : "";
  return { accent, original, fromBrand: Boolean(candidates.length), headingFont, bodyFont };
}
/* ----------------------------------------------------------- the site brand */
const TYPE_ACCENT = {
  salon: "#9d174d",
  clinic: "#0f766e",
  restaurant: "#b45309",
  education: "#4338ca",
  fitness: "#c2410c",
  retail: "#047857",
  services: "#1d4ed8",
};
export function siteBrand(scan) {
  const k = scan.knowledge;
  const cap = scan.capture;
  const t = brandTokens(k, cap, TYPE_ACCENT[k.businessType]);
  const measured = [...(cap?.brand.images ?? [])].sort((a, b) => b.w * b.h - a.w * a.h);
  const pool = [];
  for (const i of [...measured, ...(k.content?.images ?? [])]) if (!pool.some((p) => p.src === i.src)) pool.push({ src: i.src, alt: i.alt });
  // A photo crops well into the hero; a very wide banner (often with text baked in) is shown whole instead.
  const photo = measured.find((i) => i.w >= i.h * 1.1 && i.w <= i.h * 2.1);
  const banner = measured.find((i) => i.w > i.h * 2.1);
  const pick = photo ?? banner;
  const hero = pick ? { src: pick.src, alt: pick.alt, wide: pick === banner } : (pool[0] ?? (k.content?.ogImage ? { src: k.content.ogImage, alt: "" } : null));
  const rated = (scan.presence?.listings ?? []).filter((l) => l.rating).sort((a, b) => (b.reviews ?? 0) - (a.reviews ?? 0))[0];
  return {
    accent: t.accent,
    original: t.original,
    fromBrand: t.fromBrand,
    headingFont: t.headingFont,
    bodyFont: t.bodyFont,
    logo: k.content?.logo || cap?.brand.logo || "",
    hero,
    gallery: pool.filter((p) => p.src !== hero?.src).slice(0, 6),
    rating: rated ? { value: rated.rating, count: rated.reviews, platform: rated.platform, url: rated.url } : null,
  };
}
