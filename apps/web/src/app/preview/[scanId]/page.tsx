import type { Metadata } from "next";
import Link from "next/link";
import { SiteView } from "@/components/site/site-view";
import { buildSearchPack } from "@/lib/aisearch";
import { siteBrand } from "@/lib/makeover";
import { getScan } from "@/lib/store";

export const dynamic = "force-dynamic";

/** The redesigned website for a scan, before the business goes live. Not indexed; the form doesn't send. */
export async function generateMetadata({ params }: PageProps<"/preview/[scanId]">): Promise<Metadata> {
  const { scanId } = await params;
  const scan = getScan(scanId);
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

export default async function Preview({ params }: PageProps<"/preview/[scanId]">) {
  const { scanId } = await params;
  const scan = getScan(scanId);
  if (!scan) {
    return (
      <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: 24, textAlign: "center" }}>
        <p>
          This preview has expired. <Link href="/">Analyze the website again</Link>
        </p>
      </main>
    );
  }
  return <SiteView k={scan.knowledge} search={buildSearchPack(scan.knowledge)} brand={siteBrand(scan)} agentId={null} preview />;
}
