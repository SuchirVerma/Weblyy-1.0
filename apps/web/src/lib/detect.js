const pathOf = (u) => {
  try {
    return new URL(u).pathname || "/";
  } catch {
    return "/";
  }
};
function fmtPhone(p) {
  const d = p.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) return `+91 ${d.slice(2, 7)} ${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 5)} ${d.slice(5)}`;
  if (d.length === 11 && d.startsWith("0")) return `${d.slice(0, 3)} ${d.slice(3, 7)} ${d.slice(7)}`;
  return p;
}
export function detectTouchpoints(k) {
  const tps = [];
  const add = (t) => tps.push({ ...t, id: `tp${tps.length + 1}` });
  for (const w of k.whatsapp) {
    add({
      channel: "whatsapp",
      label: "WhatsApp chat link",
      detail: /\d{8,}/.test(w) ? `Customers message ${fmtPhone(w)} directly` : "Opens a WhatsApp chat with the business",
      page: "/",
    });
  }
  for (const f of k.forms) {
    const isBooking = f.purpose === "booking";
    add({
      channel: isBooking ? "booking" : "form",
      label: isBooking ? "Booking form" : f.purpose === "newsletter" ? "Newsletter sign-up" : `${f.purpose[0].toUpperCase()}${f.purpose.slice(1)} form`,
      detail: `${f.fields.length} field${f.fields.length === 1 ? "" : "s"}: ${f.fields.slice(0, 4).join(", ")}`,
      page: f.page,
    });
  }
  for (const e of k.embeds) {
    if (/booking|appointments|form|typeform/i.test(e)) add({ channel: "booking", label: e, detail: "Embedded booking or form tool", page: "/" });
    else if (/chat|widget/i.test(e)) add({ channel: "chat", label: e, detail: "Live chat or messaging widget on the site", page: "/" });
  }
  for (const e of k.emails.slice(0, 2)) add({ channel: "email", label: "Email address", detail: e, page: "/" });
  for (const p of k.phones.slice(0, 2)) add({ channel: "phone", label: "Phone number", detail: fmtPhone(p), page: "/" });
  if (k.prices.length) {
    add({
      channel: "web",
      label: "Price list",
      detail: `${k.prices.length} priced items published`,
      page: pathOf(k.pages.find((p) => /price|rate|menu|service/i.test(p.url))?.url ?? k.url),
    });
  }
  if (k.faqs.length) add({ channel: "web", label: "FAQ section", detail: `${k.faqs.length} questions answered on the site`, page: "/" });
  if (k.hours.length) add({ channel: "web", label: "Opening hours", detail: k.hours[0].slice(0, 60), page: "/" });
  if (k.instagram) {
    add({
      channel: "social",
      label: "Instagram DMs",
      detail: `@${k.instagram.handle}${k.instagram.followers ? ` · ${k.instagram.followers} followers` : ""}`,
      page: "instagram",
    });
  }
  const others = k.socials.filter((x) => !(k.instagram && x === "Instagram"));
  if (others.length) add({ channel: "social", label: "Social DMs", detail: others.join(", "), page: "/" });
  return tps;
}
export function findGaps(k) {
  const gaps = [];
  if (k.instagram && k.pages.every((p) => p.url.includes("instagram.com"))) {
    gaps.push("No website. Customers can only reach you through Instagram DMs or by calling, and every DM needs a human.");
  }
  const hasChat = k.embeds.some((e) => /chat|widget/i.test(e));
  const hasBookingTool = k.embeds.some((e) => /booking|appointments/i.test(e));
  if (!hasChat) gaps.push("No chat widget or auto-reply found. Every message waits for a human.");
  if (!k.whatsapp.length) gaps.push("No WhatsApp link, even though most customers prefer it.");
  if (!hasBookingTool && !k.forms.some((f) => f.purpose === "booking")) gaps.push("No online booking. Appointments happen by call or message.");
  if (!k.prices.length) gaps.push("No prices published, so customers have to ask for every rate.");
  if (!k.hours.length) gaps.push("Opening hours aren't clearly listed.");
  if (k.forms.length && !hasChat) gaps.push("Form submissions land in an inbox with no instant reply.");
  return gaps;
}
