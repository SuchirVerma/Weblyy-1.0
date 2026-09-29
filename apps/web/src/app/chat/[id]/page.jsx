import Link from "next/link";
import { AudienceChat } from "@/components/audience-chat";
import { getAgent } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }) {
  const { id } = await params;
  const agent = await getAgent(id);
  return { title: agent ? `Chat with ${agent.knowledge.name}` : "Chat not found | Weblyy" };
}
export default async function ChatPage({ params, searchParams }) {
  const { id } = await params;
  const { embed, src } = await searchParams;
  const source = embed === "1" ? "Website AI Agent" : src === "qr" ? "QR code" : "Chat link";
  const agent = await getAgent(id);
  if (!agent) {
    return (
      <main id="main" tabIndex={-1} style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <div style={{ display: "grid", gap: 14, maxWidth: 360 }}>
          <h1 className="h-display" style={{ fontSize: "2rem" }}>
            This chat isn&apos;t live anymore.
          </h1>
          <p className="muted" style={{ margin: 0 }}>
            The agent may have been switched off. Ask the presenter for a fresh QR code.
          </p>
          <Link href="/" className="btn btn-ghost">
            What is Weblyy?
          </Link>
        </div>
      </main>
    );
  }
  const k = agent.knowledge;
  const suggestions = [
    k.prices[0] ? `${k.prices[0].name} kitne ka hai?` : "Price kya hai?",
    "Saturday 4pm free hai?",
    "Kab tak khule ho?",
    "Where are you located?",
  ];
  return (
    <main id="main" tabIndex={-1}>
      <AudienceChat agentId={agent.id} name={k.name} suggestions={suggestions} source={source} />
    </main>
  );
}
