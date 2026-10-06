import type { MetadataRoute } from "next";
import { client } from "@/sanity/lib/client";
import { buildSitemap, type SitemapData } from "@/lib/sitemap";

// Refreshed by the Sanity publish webhook (/api/revalidate); hourly is only the fallback.
export const revalidate = 3600;

// Same filters as getAllProducts / getShopPrints / getAllPosts, slugs only.
const QUERY = `{
  "free": *[_type == "product" && listing != "shop" && defined(slug.current)]{ "slug": slug.current, "updatedAt": _updatedAt },
  "shop": *[_type == "product" && listing == "shop" && defined(slug.current)]{ "slug": slug.current, "updatedAt": _updatedAt },
  "posts": *[_type == "post" && publishedAt < now() && defined(slug.current)]{ "slug": slug.current, "updatedAt": coalesce(updatedAt, _updatedAt) }
}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    return buildSitemap(await client.fetch<SitemapData>(QUERY));
  } catch (error) {
    // A sitemap with only the fixed pages beats a 500 a crawler remembers.
    console.error("[SITEMAP] Sanity fetch failed, listing fixed pages only:", error);
    return buildSitemap(null);
  }
}
