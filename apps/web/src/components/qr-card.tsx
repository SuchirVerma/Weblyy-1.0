"use client";
import QRCode from "qrcode";
import { useEffect, useState } from "react";
import styles from "./qr-card.module.css";

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "agent";

/** QR code for the agent's chat link: download, print as a counter poster, or copy the link. */
export function QrCard({ chatPath, name }: { chatPath: string; name: string }) {
  const [url, setUrl] = useState("");
  const [png, setPng] = useState("");
  const [isLocal, setIsLocal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/api/status")
      .then((r) => r.json())
      .catch(() => ({}))
      .then(async (s: { publicOrigin?: string | null }) => {
        const origin = s.publicOrigin || window.location.origin;
        const link = `${origin}${chatPath}?src=qr`;
        const data = await QRCode.toDataURL(link, { margin: 1, width: 720, color: { dark: "#111827", light: "#ffffff" } });
        if (!alive) return;
        setUrl(link);
        setPng(data);
        setIsLocal(/localhost|127\.0\.0\.1/.test(origin));
      });
    return () => {
      alive = false;
    };
  }, [chatPath]);

  const download = () => {
    const a = document.createElement("a");
    a.href = png;
    a.download = `${slug(name)}-qr.png`;
    a.click();
  };

  const printPoster = () => {
    const w = window.open("", "_blank", "width=720,height=900");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(name)} QR poster</title>
<style>
  @page { size: A5; margin: 0 }
  * { box-sizing: border-box }
  body { margin: 0; font-family: "Albert Sans", system-ui, sans-serif; color: #111827; background: #fff }
  .p { width: 148mm; height: 210mm; margin: auto; padding: 16mm 14mm; display: flex; flex-direction: column; align-items: center; justify-content: space-between; text-align: center }
  .k { font: 600 11px/1 ui-monospace, monospace; letter-spacing: .16em; text-transform: uppercase; color: #2563eb }
  h1 { font-size: 30px; line-height: 1.1; margin: 10px 0 0; letter-spacing: -.02em }
  .q { width: 92mm; height: 92mm; padding: 5mm; border: 2px solid #111827; border-radius: 8mm }
  .q img { width: 100%; height: 100%; display: block }
  h2 { font-size: 22px; margin: 0 }
  p { margin: 6px 0 0; font-size: 14px; color: #374151 }
  .u { font: 11px ui-monospace, monospace; color: #5b6473; word-break: break-all }
</style></head><body><div class="p">
  <div><div class="k">Ask us anything</div><h1>${esc(name)}</h1></div>
  <div class="q"><img src="${png}" alt="QR code"></div>
  <div><h2>Scan to chat with us</h2><p>Prices, timings and bookings. Replies in seconds, day or night.<br>No app needed.</p></div>
  <div class="u">${esc(url)}</div>
</div><script>document.querySelector("img").addEventListener("load", () => { window.focus(); window.print(); }); if (document.querySelector("img").complete) { window.focus(); window.print(); }</script></body></html>`);
    w.document.close();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.img}>{png ? <img src={png} alt={`QR code that opens the chat with ${name}`} width={168} height={168} /> : <small>Making QR…</small>}</div>
      <div className={styles.body}>
        <b>Scan to chat</b>
        <small>
          Put it on the counter, menu, visiting cards or posters. Customers scan and chat with the agent, no app to install. Chats from it show up as
          &ldquo;QR code&rdquo; leads.
        </small>
        {isLocal && <small className={styles.warn}>This laptop has no network address, so phones can&rsquo;t open this code. Set APP_URL or join Wi-Fi.</small>}
        <div className={styles.actions}>
          <button type="button" className="btn btn-primary btn-sm" onClick={printPoster} disabled={!png}>
            Print poster
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={download} disabled={!png}>
            Download PNG
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={copy} disabled={!url}>
            {copied ? "Copied ✓" : "Copy link"}
          </button>
        </div>
      </div>
    </div>
  );
}
