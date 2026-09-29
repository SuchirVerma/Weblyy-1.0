import "server-only";
export function smsProvider() {
  if (process.env.FAST2SMS_API_KEY) return "fast2sms";
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_SMS_FROM) return "twilio";
  return null;
}
/** Indian mobile number as 10 digits, or null when it isn't one. */
export function indianMobile(raw) {
  let d = raw.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}
export class NotConfigured extends Error {}
export async function sendSms(to, text) {
  const mobile = indianMobile(to);
  if (!mobile) throw new Error(`"${to}" is not a valid Indian mobile number.`);
  const provider = smsProvider();
  if (!provider) throw new NotConfigured("No SMS provider set. Add FAST2SMS_API_KEY (or Twilio SMS keys) to .env.local.");
  if (provider === "fast2sms") {
    const res = await fetch(process.env.FAST2SMS_ENDPOINT || "https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: { authorization: process.env.FAST2SMS_API_KEY, "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ route: "q", message: text, numbers: mobile, flash: "0" }),
      signal: AbortSignal.timeout(15_000),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data?.return) {
      const why = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
      throw new Error(`Fast2SMS: ${why || `HTTP ${res.status}`}`);
    }
    return `fast2sms:${data.request_id ?? "sent"}`;
  }
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ From: process.env.TWILIO_SMS_FROM, To: `+91${mobile}`, Body: text }),
    signal: AbortSignal.timeout(15_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(`Twilio: ${data?.message || `HTTP ${res.status}`}`);
  return `twilio:${data?.sid ?? "sent"}`;
}
