"use client";
import { useEffect, useState } from "react";

/** A copyable code block. `{ORIGIN}` is replaced with this app's address. */
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [origin, setOrigin] = useState("https://your-flowscout-url");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then((s: { publicOrigin?: string | null }) => setOrigin(process.env.NEXT_PUBLIC_APP_URL || s.publicOrigin || window.location.origin))
      .catch(() => setOrigin(window.location.origin));
  }, []);
  const text = code.replaceAll("{ORIGIN}", origin);
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
      <pre>
        <code>{text}</code>
      </pre>
    </div>
  );
}
