"use client";
import { useEffect, useState } from "react";
/** A copyable code block. `{ORIGIN}` is replaced with this app's address. Long code starts folded to a few lines. */
export function CodeBlock({ code, label, fold = 6 }) {
  const [origin, setOrigin] = useState("https://your-weblyy-url");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s) => setOrigin(process.env.NEXT_PUBLIC_APP_URL || s.publicOrigin || window.location.origin))
      .catch(() => setOrigin(window.location.origin));
  }, []);
  const text = code.replaceAll("{ORIGIN}", origin);
  const long = text.split("\n").length > fold || text.length > fold * 90;
  return (
    <div className="codeblock">
      <div className="codeblock-head">
        <span>{label ?? "Code"}</span>
        <button
          type="button"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(text);
              setCopied(true);
              setTimeout(() => setCopied(false), 1600);
            } catch {
              /* clipboard blocked */
            }
          }}
        >
          {copied ? "Copied ✓" : "Copy"}
        </button>
      </div>
      <pre data-folded={long && !open ? "" : undefined} style={long && !open ? { maxHeight: `${fold * 1.6}em` } : undefined}>
        <code>{text}</code>
      </pre>
      {long && (
        <button type="button" className="codeblock-more" onClick={() => setOpen(!open)} aria-expanded={open}>
          {open ? "Collapse" : `Expand (${text.split("\n").length} lines)`}
        </button>
      )}
    </div>
  );
}
