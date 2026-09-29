import Link from "next/link";
import { OwnerDemo } from "@/components/owner-demo";
import { Arrow, Nav } from "@/components/ui";

export const metadata = { title: "The owner’s side | Weblyy", description: "See what a business owner sees in Weblyy: customer chats answered by AI, leads, and the conversations that need a person.", alternates: { canonical: "/owner-demo" } };

export default function OwnerDemoPage() {
  return (
    <>
      <Nav />
      <main id="main" tabIndex={-1} className="wrap" style={{ paddingTop: 28, paddingBottom: 100, display: "grid", gap: 24 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <p className="kicker">Demo · the owner&apos;s side</p>
          <h1 className="h-display" style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)", maxWidth: "24ch" }}>
            One evening at a salon, <span className="em">from the owner&apos;s phone.</span>
          </h1>
          <p className="lede">
            Three customers message after closing time. Watch what reaches the owner and what doesn&apos;t. Press Play, or step through at your own pace.
          </p>
        </div>
        <OwnerDemo />
        <div className="chips" style={{ justifyContent: "center" }}>
          <Link className="btn btn-ghost" href="/integrate">
            How a business plugs it in <Arrow />
          </Link>
        </div>
      </main>
    </>
  );
}
