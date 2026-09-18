import { getAllProducts, getShopPrints, type FreeArt } from "@/sanity/lib/client";

/**
 * Image sitemap (PLAN-53). Sanity serves every image from a content hash, so a crawler cannot
 * guess what a picture shows from its URL and has no reason to fetch it until it has crawled the
 * page. Listing the images against the page they appear on is the supported way to tell Google
 * and Bing about them, and it carries a title so they know what each one is.
 *
 * Rebuilt hourly, same as the pages themselves.
 */
export const revalidate = 3600;

const SITE = "https://www.thepixelprince.com";

/** XML has five characters that cannot appear raw in text. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

interface SitemapImage {
  url: string;
  title: string;
}

/** Every image a print page shows, most important first, without repeats. */
function imagesFor(art: FreeArt): SitemapImage[] {
  const out: SitemapImage[] = [];
  const seen = new Set<string>();
  const add = (url: string | undefined, title: string) => {
    if (!url || seen.has(url)) return;
    seen.add(url);
    out.push({ url, title });
  };

  // The title is what Google reads to know what the picture is, and the bare artwork name says
  // almost nothing: twenty-one shop images went out as "Retro Controllers". Where a human or the
  // Studio generator has written alt text, that sentence is the description, and the name is only
  // the fallback for an image nobody has described yet.
  for (const offer of art.offers ?? []) {
    add(offer.artUrl, offer.artAlt || art.title);
    add(offer.mockupUrl, offer.mockupAlt || art.title);
  }
  add(art.detailImage, art.detailImageAlt || art.title);
  add(art.previewImage, art.previewImageAlt || art.title);
  for (const photo of art.galleryImages ?? []) add(photo.url, photo.alt || art.title);
  return out;
}

function urlEntry(loc: string, images: SitemapImage[]): string {
  const tags = images
    .map(
      (image) =>
        `    <image:image>\n      <image:loc>${escapeXml(image.url)}</image:loc>\n      <image:title>${escapeXml(image.title)}</image:title>\n    </image:image>`
    )
    .join("\n");
  return `  <url>\n    <loc>${escapeXml(loc)}</loc>\n${tags}\n  </url>`;
}

export async function GET(): Promise<Response> {
  const [shopPrints, freePrints] = await Promise.all([getShopPrints(), getAllProducts()]);

  const entries = [
    ...shopPrints.map((art) => ({ loc: `${SITE}/prints/${art.id}`, images: imagesFor(art) })),
    ...freePrints.map((art) => ({ loc: `${SITE}/art/${art.id}`, images: imagesFor(art) })),
  ].filter((entry) => entry.images.length > 0);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${entries.map((entry) => urlEntry(entry.loc, entry.images)).join("\n")}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
