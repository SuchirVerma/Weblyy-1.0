import Link from "next/link";
import { OwnerInbox } from "@/components/owner-inbox";
import { getAgent } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "Owner inbox | Weblyy", robots: { index: false } };

export default async function OwnerPage({ params, searchParams }: PageProps<"/owner/[id]">) {
  const { id } = await params;
  const { key } = await searchParams;
  const agent = await getAgent(id);
  if (!agent || typeof key !== "string" || key !== agent.ownerKey) {
    return (
      <main id="main" tabIndex={-1} style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div style={{ display: "grid", gap: 14, maxWidth: 380 }}>
          <h1 className="h-display" style={{ fontSize: "2rem" }}>
            This inbox link <span className="em">isn&apos;t valid.</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Open the owner link from the live console again. It includes a private key.
          </p>
          <Link href="/" className="btn btn-ghost">
            Go to Weblyy
          </Link>
        </div>
      </main>
    );
  }
  return (
    <main id="main" tabIndex={-1} style={{ maxWidth: 980, margin: "0 auto" }}>
      <OwnerInbox agentId={agent.id} ownerKey={key} full />
    </main>
  );
}
