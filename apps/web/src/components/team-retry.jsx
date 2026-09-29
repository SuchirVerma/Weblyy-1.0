"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
export function TeamRetry({ adminKey }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="btn btn-ghost btn-sm"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await fetch(`/api/team/outbox${adminKey ? `?key=${encodeURIComponent(adminKey)}` : ""}`, { method: "POST" });
        } finally {
          setBusy(false);
          router.refresh();
        }
      }}
    >
      {busy ? "Retrying…" : "Retry now"}
    </button>
  );
}
