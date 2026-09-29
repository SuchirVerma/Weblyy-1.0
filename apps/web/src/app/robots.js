import { siteUrl } from "@/lib/site-url";
export default function robots() {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/owner", "/team", "/preview", "/chat", "/scan"] },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
