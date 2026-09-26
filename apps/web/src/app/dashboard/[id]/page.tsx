import Link from "next/link";
import { CommandCenter } from "@/components/cc/command-center";
import { getAgent } from "@/lib/store";

export const dynamic = "force-dynamic";
export const metadata = { title: "AI Business Command Center | FlowScout", robots: { index: false } };

export default async function DashboardPage({ params, searchParams }: PageProps<"/dashboard/[id]">) {
  const { id } = await params;
  const { key } = await searchParams;
  const agent = await getAgent(id);
  if (!agent || typeof key !== "string" || key !== agent.ownerKey) {
    return (
      <main id="main" tabIndex={-1} style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div style={{ display: "grid", gap: 14, maxWidth: 420 }}>
          <h1 className="h-display" style={{ fontSize: "2rem" }}>
            This Command Center link <span className="em">isn&apos;t valid.</span>
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            Use the private link you got after making your business AI-ready, or analyze your website again.
          </p>
          <Link href="/" className="btn btn-primary">
            Analyze a website
          </Link>
        </div>
      </main>
    );
  }
  return <CommandCenter id={agent.id} ownerKey={key} />;
}
