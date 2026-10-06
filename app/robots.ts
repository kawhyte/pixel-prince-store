import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/sitemap";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Studio and the API are not pages: nothing there should be crawled or indexed.
      disallow: ["/studio", "/api/"],
    },
    sitemap: [`${SITE_URL}/sitemap.xml`, `${SITE_URL}/sitemap-images.xml`],
  };
}
