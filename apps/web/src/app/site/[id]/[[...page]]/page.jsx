import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGE_SLUGS, SiteView, siteModel } from "@/components/site/site-view";
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
/** "" for the home page, a known page name, or null when the address isn't one of the site's pages. */
function pageOf(parts, d) {
  const slug = parts?.[0] ?? "";
  if (!slug) return "";
  if (parts.length > 1 || !PAGE_SLUGS.includes(slug)) return null;
  return siteModel(d.k, d.search, d.brand).pages.some((p) => p.slug === slug) ? slug : null;
}
export async function generateMetadata({ params }) {
  const { id, page } = await params;
  const d = await load(id);
  if (!d) return { title: "Not found" };
  const slug = pageOf(page, d);
  const label = slug ? siteModel(d.k, d.search, d.brand).pages.find((p) => p.slug === slug)?.label : "";
  const image = d.brand.hero?.src ?? d.k.content?.ogImage;
  const title = label ? `${label} | ${d.k.name}` : d.search.metaTitle;
  return {
    title,
    description: d.search.metaDescription,
    alternates: { canonical: `/site/${id}${slug ? `/${slug}` : ""}` },
    openGraph: { title, description: d.search.metaDescription, ...(image && { images: [image] }) },
    icons: d.k.content?.favicon ? { icon: d.k.content.favicon } : undefined,
  };
}
export default async function TransformedSite({ params }) {
  const { id, page } = await params;
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
  const slug = pageOf(page, d);
  if (slug === null) notFound();
  return <SiteView k={d.k} search={d.search} brand={d.brand} agentId={d.agent.id} page={slug} base={`/site/${id}`} />;
}
