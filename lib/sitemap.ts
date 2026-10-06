import type { MetadataRoute } from "next";
import { COLLECTIONS } from "@/config/collections";

export const SITE_URL = "https://www.thepixelprince.com";

export interface SitemapDoc {
  slug: string;
  updatedAt?: string;
}

export interface SitemapData {
  free: SitemapDoc[];
  shop: SitemapDoc[];
  posts: SitemapDoc[];
}

/** Pages that always exist, whatever is in Sanity. */
const STATIC_PATHS = ["/", "/prints", "/free-downloads", "/blog", "/about", "/shipping-returns", "/privacy", "/terms"];

/**
 * Every public page, built from what Sanity holds right now, so a print published after a deploy
 * is listed without waiting for the next build. With no data (Sanity down) the static pages and
 * collections still go out.
 */
export function buildSitemap(data: SitemapData | null, site: string = SITE_URL): MetadataRoute.Sitemap {
  const entry = (path: string, updatedAt?: string): MetadataRoute.Sitemap[number] => ({
    url: `${site}${path === "/" ? "" : path}`,
    ...(updatedAt ? { lastModified: new Date(updatedAt) } : {}),
  });
  const docs = (prefix: string, list: SitemapDoc[] = []) =>
    list.filter((d) => d.slug).map((d) => entry(`${prefix}/${d.slug}`, d.updatedAt));

  return [
    ...STATIC_PATHS.map((path) => entry(path)),
    ...COLLECTIONS.map((c) => entry(`/collections/${c.slug}`)),
    ...docs("/prints", data?.shop),
    ...docs("/art", data?.free),
    ...docs("/blog", data?.posts),
  ];
}
