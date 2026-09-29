import { REGIONS } from "@/lib/regions";
import { siteUrl } from "@/lib/site-url";
/** The public Weblyy pages Google should list. Businesses' own sites and dashboards aren't included. */
export default function sitemap() {
  const base = siteUrl();
  const pages = [["", 1], ["/how", 0.8], ["/setup", 0.8], ["/integrate", 0.6], ["/owner-demo", 0.6], ["/find", 0.5], ...REGIONS.map((r) => [`/${r.key}`, 0.8])];
  return pages.map(([path, priority]) => ({ url: `${base}${path}`, lastModified: new Date(), changeFrequency: "weekly", priority }));
}
