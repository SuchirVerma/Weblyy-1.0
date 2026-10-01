import { siteUrl } from "@/lib/site-url";
export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/owner", "/team", "/preview", "/chat", "/scan", "/mirror"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
