/**
 * Structured data for the free printables: the artwork pages and the gallery that lists them.
 *
 * The artwork page already declared a VisualArtwork with `isAccessibleForFree`, which is the
 * important part: a free printable is a work, not a product at a price of nothing. What it was
 * missing is everything around that: the trail back to the gallery, and the licence the
 * download actually ships under. Both come from data the page already holds; nothing here is a
 * claim the site does not make in words elsewhere.
 *
 * No `offers` block, deliberately. It was removed in 761a732 because a $0 Offer invites product
 * rich results a free download cannot honour, and nothing below quietly puts one back.
 */
import { LICENSE_SUMMARY } from "@/config/license";
import { BRAND_NAME, SITE_URL } from "@/lib/product-schema";
import type { FreeArt } from "@/sanity/lib/client";

/** Where the personal-use licence is written out for a reader. */
export const LICENSE_URL = `${SITE_URL}/terms`;

const GALLERY_NAME = "Free printable wall art";
const GALLERY_URL = `${SITE_URL}/free-downloads`;

/** The pages a reader passes through to reach this artwork. */
export function freeArtBreadcrumb(art: Pick<FreeArt, "id" | "title">): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: GALLERY_NAME, item: GALLERY_URL },
      { "@type": "ListItem", position: 3, name: art.title, item: `${SITE_URL}/art/${art.id}` },
    ],
  };
}

/** Photos of the work, in the order a reader meets them, each listed once. */
export function artworkImages(art: FreeArt): string[] {
  const urls = [art.detailImage, art.previewImage, ...(art.galleryImages ?? []).map((g) => g.url)];
  return urls.filter((url, i, all): url is string => !!url && all.indexOf(url) === i);
}

/**
 * No `width` / `height`. On VisualArtwork those mean the physical size of the work, and a
 * printable has no one physical size; declaring the file's pixels there reads as a measurement
 * in inches to anything that takes the property at its word. Nothing consumes it either way.
 */
export function freeArtSchema(art: FreeArt): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: art.title,
    description: art.description,
    image: artworkImages(art),
    creator: { "@type": "Organization", name: art.artist || BRAND_NAME },
    isAccessibleForFree: true,
    url: `${SITE_URL}/art/${art.id}`,
    artform: "Printable wall art",
    artMedium: "Digital",
    license: LICENSE_URL,
    usageInfo: LICENSE_SUMMARY,
    ...(art.createdAt ? { dateCreated: art.createdAt } : {}),
    ...(art.category ? { genre: art.category } : {}),
    ...(art.tags?.length ? { keywords: art.tags.join(", ") } : {}),
  };
}

/**
 * The gallery as a list of the works on it. `/prints` says what it is in structured data and
 * `/free-downloads` said nothing, so the larger of the two catalogues was the invisible one.
 */
export function freeGallerySchema(prints: Pick<FreeArt, "id" | "title">[]): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: GALLERY_NAME,
    url: GALLERY_URL,
    isAccessibleForFree: true,
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: prints.length,
      itemListElement: prints.map((art, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: art.title,
        url: `${SITE_URL}/art/${art.id}`,
      })),
    },
  };
}

export function freeGalleryBreadcrumb(): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: GALLERY_NAME, item: GALLERY_URL },
    ],
  };
}
