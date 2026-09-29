import Link from "next/link";
import { SiteView } from "@/components/site/site-view";
import { buildSearchPack } from "@/lib/aisearch";
import { siteBrand } from "@/lib/makeover";
import { getAgent } from "@/lib/store";
export const dynamic = "force-dynamic";
async function load(id) {
  const agent = await getAgent(id);
  if (!agent) return null;
  const k = agent.knowledge;
  const search = agent.workspace?.search ?? buildSearchPack(k);
  const brand = agent.workspace?.makeover?.brand ?? siteBrand({ knowledge: k, touchpoints: [], gaps: [] });
  return { agent, k, search, brand };
}
export async function generateMetadata({ params }) {
  const { id } = await params;
  const d = await load(id);
  if (!d) return { title: "Not found" };
  const image = d.brand.hero?.src ?? d.k.content?.ogImage;
  return {
    title: d.search.metaTitle,
    description: d.search.metaDescription,
    alternates: { canonical: `/site/${id}` },
    openGraph: { title: d.search.metaTitle, description: d.search.metaDescription, ...(image && { images: [image] }) },
    icons: d.k.content?.favicon ? { icon: d.k.content.favicon } : undefined,
  };
}
export default async function TransformedSite({ params }) {
  const { id } = await params;
  const d = await load(id);
  if (!d) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <p>
          This website isn&apos;t live anymore. <Link href="/">Go to Weblyy</Link>
        </p>
      </main>
    );
  }
  return <SiteView k={d.k} search={d.search} brand={d.brand} agentId={d.agent.id} />;
}
