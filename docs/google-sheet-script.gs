/**
 * Weblyy → Google Sheet: adds one row for every free setup call request.
 *
 * Setup (about 2 minutes):
 *   1. Open the Google Sheet "Weblyy – Free setup call requests".
 *   2. Extensions → Apps Script. Delete what's there, paste this whole file, click Save.
 *   3. Deploy → New deployment → type "Web app".
 *        Execute as: Me    Who has access: Anyone
 *      Click Deploy, allow access, copy the Web app URL (ends in /exec).
 *   4. Put that URL in apps/web/.env.local as SHEETS_WEBHOOK_URL=… and restart the server.
 *
 * The secret below must match SHEETS_SECRET in .env.local. Requests without it are ignored.
 */
const SECRET = "PASTE_SHEETS_SECRET_HERE"; // same value as SHEETS_SECRET in .env.local
const HEADERS = ["Request ID", "Date & time (IST)", "Name", "Mobile", "Help needed", "Business", "Website", "Website made with", "Best time to call", "Note"];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
    const body = JSON.parse((e && e.postData && e.postData.contents) || "{}");
    if (body.secret !== SECRET) return reply({ ok: false, error: "wrong secret" });
    const row = body.row || {};
    if (!row["Request ID"]) return reply({ ok: false, error: "missing Request ID" });

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(HEADERS);
      sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold");
      sheet.setFrozenRows(1);
    }

    // Retries from the server must never create a second row for the same request.
    const last = sheet.getLastRow();
    if (last > 1) {
      const ids = sheet.getRange(2, 1, last - 1, 1).getValues().map(function (r) { return String(r[0]); });
      if (ids.indexOf(String(row["Request ID"])) !== -1) return reply({ ok: true, duplicate: true });
    }

    // Leading apostrophe keeps phone numbers as text (no lost leading digits, no scientific notation).
    const values = HEADERS.map(function (h) {
      const v = row[h] == null ? "" : String(row[h]);
      return h === "Mobile" ? "'" + v : v;
    });
    sheet.appendRow(values);
    return reply({ ok: true, row: sheet.getLastRow() });
  } catch (err) {
    return reply({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}

/** Open the web app URL in a browser to check it's deployed. */
function doGet() {
  return reply({ ok: true, service: "weblyy-sheet" });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
