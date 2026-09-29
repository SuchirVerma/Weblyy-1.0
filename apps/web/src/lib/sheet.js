import "server-only";
import { NotConfigured } from "./sms";
/**
 * Appends one row to a Google Sheet through the Apps Script web app in docs/google-sheet-script.gs.
 *   SHEETS_WEBHOOK_URL  the web app URL (…/exec)
 *   SHEETS_SECRET       the same secret written into the script
 * The script skips a request ID it already has, so retries never create duplicate rows.
 */
export function sheetConfigured() {
  return Boolean(process.env.SHEETS_WEBHOOK_URL && process.env.SHEETS_SECRET);
}
export async function appendRow(row) {
  const url = process.env.SHEETS_WEBHOOK_URL;
  const secret = process.env.SHEETS_SECRET;
  if (!url || !secret) throw new NotConfigured("Google Sheet not connected. Add SHEETS_WEBHOOK_URL and SHEETS_SECRET to .env.local.");
  const local = /^http:\/\/(127\.0\.0\.1|localhost):\d+\//.test(url); // test stand-in only
  if (!local && !/^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url))
    throw new Error("SHEETS_WEBHOOK_URL should look like https://script.google.com/macros/s/…/exec");
  // Apps Script answers a POST with a redirect to the result; fetch follows it.
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ secret, row }),
    redirect: "follow",
    signal: AbortSignal.timeout(20_000),
  });
  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    // An HTML page here usually means the web app isn't shared with "Anyone".
    throw new Error(
      /<html/i.test(text)
        ? "Google returned a web page, not JSON. Deploy the script as a web app with access set to “Anyone”."
        : `Unexpected reply (HTTP ${res.status}).`,
    );
  }
  if (!res.ok || !data?.ok) throw new Error(`Google Sheet: ${data?.error || `HTTP ${res.status}`}`);
  return data.duplicate ? "already in sheet" : `row ${data.row ?? "added"}`;
}
