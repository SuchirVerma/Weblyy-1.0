import Link from "next/link";
import { notFound } from "next/navigation";
import { PAGE_SLUGS, SiteView, siteModel } from "@/components/site/site-view";
import { buildSearchPack } from "@/lib/aisearch";
import { siteBrand } from "@/lib/makeover";
import { getScan } from "@/lib/store";
export const dynamic = "force-dynamic";
/** The redesigned website for a scan, before the business goes live. Not indexed; the form doesn't send. */
function pageOf(parts, k, search, brand) {
  const slug = parts?.[0] ?? "";
  if (!slug) return "";
  if (parts.length > 1 || !PAGE_SLUGS.includes(slug)) return null;
  return siteModel(k, search, brand).pages.some((p) => p.slug === slug) ? slug : null;
}
export async function generateMetadata({ params }) {
  const { scanId } = await params;
  const scan = await getScan(scanId);
  if (!scan) return { title: "Preview expired", robots: { index: false } };
  const search = buildSearchPack(scan.knowledge);
  const image = siteBrand(scan).hero?.src ?? scan.knowledge.content?.ogImage;
  return {
    title: search.metaTitle,
    description: search.metaDescription,
    robots: { index: false, follow: false },
    alternates: { canonical: `/preview/${scanId}` },
    openGraph: { title: search.metaTitle, description: search.metaDescription, ...(image && { images: [image] }) },
    icons: scan.knowledge.content?.favicon ? { icon: scan.knowledge.content.favicon } : undefined,
  };
}
export default async function Preview({ params, searchParams }) {
  const { scanId, page } = await params;
  const { scene } = await searchParams;
  const scan = await getScan(scanId);
  if (!scan) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <p>
          This preview has expired. <Link href="/">Analyze the website again</Link>
        </p>
      </main>
    );
  }
  const search = buildSearchPack(scan.knowledge);
  const brand = siteBrand(scan);
  const slug = pageOf(page, scan.knowledge, search, brand);
  if (slug === null) notFound();
  return <SiteView k={scan.knowledge} search={search} brand={brand} agentId={null} preview page={slug} base={`/preview/${scanId}`} scene={typeof scene === "string" ? scene : undefined} />;
}
