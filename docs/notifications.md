# Free setup call requests → SMS + Google Sheet

When a business owner taps **Request a free setup call** (Dashboard → Go live), Weblyy:

1. saves the request to disk (`.data/outbox.json`) before doing anything else,
2. sends an SMS to **the team number** (`SETUP_SMS_TO`) with name, mobile, what they need help with, business and best time to call,
3. adds a row to the Google Sheet **"Weblyy – Free setup call requests"**.

If the SMS service or Google is down, each one is retried by itself (1 min, 5 min, 15 min, 1 h, 3 h, then every 12 h), also after a server restart. A retry never sends a second SMS for a delivered request and never adds a second sheet row. The owner always sees "Request received".

Status for every request, with the error if something failed, is on **/team** (localhost, or `/team?key=ADMIN_KEY`). **Retry now** tries everything immediately.

## Refund requests from customers

When a customer asks a business's assistant for their money back, the assistant never says yes or no. It replies only that the owner will contact them, and the request is added to the same Google Sheet as a row with **Help needed** set to "REFUND request from a customer", the business name, the customer's name and number if they gave one, and their message in **Note**. The sheet's script emails that row like any other. One row is added per customer per day, and no SMS is sent for these.

The business owner can also get the email. They are asked for it once, the first time they open their dashboard, and can change it later under **Settings → Email alerts**. Customers never see the address, and each refund request for their business is emailed there as well. This needs the current `google-sheet-script.gs` in the sheet (paste it again and deploy a new version if the sheet has an older copy).

## 1. Google Sheet (free, ~2 minutes)

The sheet already exists in Google Drive: *Weblyy – Free setup call requests*.

1. Open it → **Extensions → Apps Script**.
2. Delete the sample code and paste the whole of `apps/web/.data/google-sheet-script.gs` (that copy already has your secret filled in; `docs/google-sheet-script.gs` is the same script with a placeholder). Click **Save**.
3. **Deploy → New deployment** → gear icon → **Web app**. Execute as **Me**, Who has access **Anyone**. **Deploy**, then **Authorize access** and allow it.
4. Copy the **Web app URL** (ends in `/exec`) into `apps/web/.env.local`:
   ```
   SHEETS_WEBHOOK_URL=https://script.google.com/macros/s/…/exec
   ```
5. Restart the server. Opening the URL in a browser should show `{"ok":true,"service":"weblyy-sheet"}`.

`SHEETS_SECRET` in `.env.local` must match `SECRET` in the script. Anyone without it is ignored.

## 2. SMS (pick one)

**Fast2SMS (India)**: sign up at fast2sms.com → Dev API → copy the API key.
```
FAST2SMS_API_KEY=…
```
Uses the Quick SMS route. Fast2SMS asks for a small wallet recharge before the API sends messages.

**Twilio**: works if you already have an account with an SMS-capable number.
```
TWILIO_ACCOUNT_SID=…
TWILIO_AUTH_TOKEN=…
TWILIO_SMS_FROM=+1…
```
On a Twilio trial, first verify the team number under *Verified Caller IDs*. Delivery to Indian numbers from a foreign number isn't guaranteed; Fast2SMS is the reliable choice for India.

If both are set, Fast2SMS is used. Restart the server after changing `.env.local`.

## Requests made before setup

They wait (status "waiting for setup" on /team) and go out automatically once the keys are in and the server restarts.
