import { profileKeyOf } from "./profiles";
import { detectPlace } from "./regions";
const SCHEMA_TYPE = {
  salon: "BeautySalon",
  clinic: "MedicalClinic",
  restaurant: "Restaurant",
  education: "EducationalOrganization",
  fitness: "HealthClub",
  retail: "Store",
  services: "LocalBusiness",
};
const TYPE_LABEL = {
  salon: "Beauty salon",
  clinic: "Clinic",
  restaurant: "Restaurant",
  education: "Coaching institute",
  fitness: "Gym & fitness studio",
  retail: "Store",
  services: "Local business",
};
export const typeLabel = (t) => TYPE_LABEL[t];
/** "Shop 14, Pocket C, Sector 9, Rohini, New Delhi, 110085" → "Rohini, New Delhi" */
export function locality(address) {
  // Known places (Delhi NCR, Jammu & Kashmir, Mumbai) are read exactly: "Rohini, New Delhi", "Gandhi Nagar, Jammu".
  const place = detectPlace(address);
  if (place?.city) return place.locality ? `${place.locality}, ${place.city}` : place.city;
  return localityGuess(address);
}
function localityGuess(address) {
  const parts = address
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p && !/^\d{6}$/.test(p) && !/^(shop|plot|house|h\.?no|flat|floor|\d)/i.test(p) && !/pocket|block|sector|gate|near|opp/i.test(p));
  return parts.slice(-2).join(", ");
}
const clip = (s, n) => (s.length <= n ? s : `${s.slice(0, n - 1).replace(/\s+\S*$/, "")}…`);
function phone(k) {
  const p = k.whatsapp.find((w) => /\d{10,}/.test(w)) ?? k.phones[0] ?? "";
  const d = p.replace(/\D/g, "");
  return d.length === 12 && d.startsWith("91") ? `+${d}` : d.length === 10 ? `+91${d}` : p;
}
/** Structured address: the known city, state and PIN are filled in separately so search engines can place the business. */
function postalAddress(address) {
  const p = detectPlace(address);
  return {
    "@type": "PostalAddress",
    streetAddress: address,
    ...(p?.city && { addressLocality: p.city }),
    ...(p?.state && { addressRegion: p.state }),
    ...(p?.pin && { postalCode: p.pin }),
    addressCountry: "IN",
  };
}
function openingHoursSpec(hours) {
  return hours.slice(0, 1);
}
export function buildSearchPack(k, publicUrl) {
  const where = k.address ? locality(k.address) : "";
  const label = (profileKeyOf(k) === "school" ? "School" : TYPE_LABEL[k.businessType]);
  const topServices = (k.prices.length ? k.prices.map((p) => p.name) : k.services).slice(0, 4);
  const metaTitle = clip(`${k.name}${where ? ` | ${label} in ${where}` : ` | ${label}`}`, 60);
  const metaDescription = clip(
    [
      `${k.name} is a ${label.toLowerCase()}${where ? ` in ${where}` : ""}.`,
      topServices.length ? `${topServices.slice(0, 3).join(", ")} and more${k.prices.length ? ", with prices listed" : ""}.` : "",
      k.hours.length ? `Open ${k.hours[0]}.` : "",
      "Chat with us for instant answers and bookings.",
    ]
      .filter(Boolean)
      .join(" "),
    158,
  );
  const summary = [
    `${k.name} is a ${label.toLowerCase()}${where ? ` based in ${where}` : ""}.`,
    k.description && !k.description.startsWith(k.name) ? k.description : "",
    topServices.length ? `Popular services include ${topServices.join(", ")}.` : "",
    k.prices.length ? `Prices start from ${[...k.prices].sort((a, b) => num(a.price) - num(b.price))[0].price}.` : "",
    k.hours.length ? `Opening hours: ${k.hours[0]}.` : "",
    k.address ? `Address: ${k.address}.` : "",
    phone(k) ? `Phone / WhatsApp: ${phone(k)}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  // FAQs: keep the site's own, then add ones we can answer truthfully from the site.
  const faqs = [...k.faqs.slice(0, 8)];
  const has = (re) => faqs.some((f) => re.test(f.q));
  if (k.hours.length && !has(/timing|open|hours|close/i)) faqs.push({ q: `What are ${k.name}'s opening hours?`, a: `We're open ${k.hours[0]}.` });
  if (k.address && !has(/where|located|address|location/i)) faqs.push({ q: `Where is ${k.name} located?`, a: `We're at ${k.address}.` });
  if (k.prices.length && !has(/price|cost|charge|fee/i)) {
    const sample = k.prices
      .slice(0, 3)
      .map((p) => `${p.name} ${p.price}`)
      .join(", ");
    faqs.push({ q: `How much do services cost at ${k.name}?`, a: `Some of our prices: ${sample}. See the full price list on our website.` });
  }
  if ((k.whatsapp.length || k.phones.length) && !has(/book|appointment|reserve/i))
    faqs.push({
      q: `How do I get in touch with ${k.name}?`,
      a: `${k.whatsapp.some((w) => /\d{8,}/.test(w)) ? "Message us on WhatsApp" : "Call us"}${phone(k) ? ` at ${phone(k)}` : ""}, or leave your details on the website and we'll get back to you.`,
    });
  const missingInfo = [];
  if (!k.address) missingInfo.push("Full address (street, area, city, PIN code)");
  if (!k.hours.length) missingInfo.push("Opening hours for each day");
  if (!k.prices.length) missingInfo.push("Services with prices");
  if (!k.phones.length && !k.whatsapp.length) missingInfo.push("Phone or WhatsApp number");
  if (k.faqs.length < 3) missingInfo.push("Answers to the 5 questions customers ask most");
  if (!k.description) missingInfo.push("A one-paragraph description of the business");
  const url = publicUrl ?? k.url;
  const business = {
    "@context": "https://schema.org",
    "@type": profileKeyOf(k) === "school" ? "School" : SCHEMA_TYPE[k.businessType],
    name: k.name,
    url,
    description: clip(summary, 300),
    ...(phone(k) && { telephone: phone(k) }),
    ...(k.emails[0] && { email: k.emails[0] }),
    ...(k.address && { address: postalAddress(k.address) }),
    ...(k.hours.length && { openingHours: openingHoursSpec(k.hours) }),
    ...(k.socialLinks.length && { sameAs: k.socialLinks.map((s) => s.url) }),
    ...(k.prices.length && {
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Services",
        itemListElement: k.prices.slice(0, 20).map((p) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: p.name },
          price: String(num(p.price) || ""),
          priceCurrency: "INR",
        })),
      },
    }),
  };
  const faqLd = faqs.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faqs.slice(0, 10).map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }
    : null;
  const llmsTxt = [
    `# ${k.name}`,
    "",
    `> ${summary}`,
    "",
    "## Services",
    ...(k.prices.length ? k.prices.slice(0, 25).map((p) => `- ${p.name}: ${p.price}`) : topServices.map((s) => `- ${s}`)),
    "",
    "## Visit & contact",
    k.address && `- Address: ${k.address}`,
    k.hours[0] && `- Hours: ${k.hours[0]}`,
    phone(k) && `- Phone / WhatsApp: ${phone(k)}`,
    k.emails[0] && `- Email: ${k.emails[0]}`,
    "",
    "## FAQs",
    ...faqs.slice(0, 10).map((f) => `- ${f.q} ${f.a}`),
  ]
    .filter((l) => typeof l === "string")
    .join("\n");
  const entities = [
    { label: "Business", value: k.name },
    { label: "Category", value: label },
    { label: "Location", value: where || "Missing" },
    { label: "Hours", value: k.hours[0] ?? "Missing" },
    { label: "Contact", value: phone(k) || k.emails[0] || "Missing" },
    { label: "Services", value: topServices.length ? topServices.join(", ") : "Missing" },
  ];
  return { metaTitle, metaDescription, summary, jsonLd: faqLd ? [business, faqLd] : [business], faqs, missingInfo, llmsTxt, entities };
}
function num(price) {
  const m = price.replace(/,/g, "").match(/\d+(\.\d+)?/);
  return m ? Number(m[0]) : 0;
}
