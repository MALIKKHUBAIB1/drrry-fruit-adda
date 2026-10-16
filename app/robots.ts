import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/", "/cart", "/checkout", "/account", "/login", "/register", "/wishlist"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
