import { describe, it, expect } from "vitest";

import { LICENSE_SUMMARY } from "@/config/license";
import {
  artworkImages,
  freeArtBreadcrumb,
  freeArtSchema,
  freeGalleryBreadcrumb,
  freeGallerySchema,
  LICENSE_URL,
} from "@/lib/artwork-schema";
import type { FreeArt } from "@/sanity/lib/client";

function art(over: Partial<FreeArt> = {}): FreeArt {
  return {
    _id: "a1",
    id: "the-moon-photography-wall-art-free-download",
    createdAt: "2026-02-03T00:00:00Z",
    title: "The Moon",
    artist: "The Pixel Prince",
    description: "Free printable wall art of the moon.",
    previewImage: "https://cdn/preview.jpg",
    detailImage: "https://cdn/detail.jpg",
    artFile: { cloudinaryUrl: "https://res/moon.png", width: 4800, height: 6000 },
    listing: "free",
    kind: "single",
    offers: [],
    tags: ["moon", "minimalist"],
    category: "Minimalist",
    ...over,
  } as FreeArt;
}

describe("free artwork structured data", () => {
  it("stays a work and never becomes a product at a price of nothing", () => {
    const schema = freeArtSchema(art());
    expect(schema["@type"]).toBe("VisualArtwork");
    expect(schema.isAccessibleForFree).toBe(true);
    // 761a732 removed the $0 Offer on purpose; nothing may put one back.
    expect(schema).not.toHaveProperty("offers");
    expect(schema).not.toHaveProperty("price");
  });

  it("carries the licence the download actually ships under", () => {
    expect(freeArtSchema(art())).toMatchObject({
      license: LICENSE_URL,
      usageInfo: LICENSE_SUMMARY,
    });
    expect(LICENSE_URL).toBe("https://www.thepixelprince.com/terms");
  });

  it("states no physical size, because a printable has none", () => {
    // VisualArtwork's width/height mean inches on a wall, not pixels in a file.
    const schema = freeArtSchema(art());
    expect(schema).not.toHaveProperty("width");
    expect(schema).not.toHaveProperty("height");
  });

  it("carries the artwork's own facts and drops the ones it lacks", () => {
    expect(freeArtSchema(art())).toMatchObject({
      artform: "Printable wall art",
      artMedium: "Digital",
      dateCreated: "2026-02-03T00:00:00Z",
      genre: "Minimalist",
      keywords: "moon, minimalist",
      creator: { "@type": "Organization", name: "The Pixel Prince" },
    });
    const bare = freeArtSchema(art({ category: undefined, tags: [] }));
    expect(bare).not.toHaveProperty("genre");
    expect(bare).not.toHaveProperty("keywords");
  });

  it("lists each photo once", () => {
    expect(artworkImages(art({ galleryImages: [{ url: "https://cdn/room.jpg" }, { url: "https://cdn/detail.jpg" }] } as Partial<FreeArt>))).toEqual([
      "https://cdn/detail.jpg",
      "https://cdn/preview.jpg",
      "https://cdn/room.jpg",
    ]);
  });

  it("puts the artwork third, under the gallery it came from", () => {
    expect(freeArtBreadcrumb(art()).itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.thepixelprince.com/" },
      { "@type": "ListItem", position: 2, name: "Free printable wall art", item: "https://www.thepixelprince.com/free-downloads" },
      {
        "@type": "ListItem",
        position: 3,
        name: "The Moon",
        item: "https://www.thepixelprince.com/art/the-moon-photography-wall-art-free-download",
      },
    ]);
  });

  it("says what the gallery holds", () => {
    const schema = freeGallerySchema([art(), art({ id: "life-is-short", title: "Life Is Short" })]);
    expect(schema).toMatchObject({ "@type": "CollectionPage", isAccessibleForFree: true });
    expect(schema.mainEntity).toMatchObject({
      "@type": "ItemList",
      numberOfItems: 2,
      itemListElement: [
        { position: 1, name: "The Moon", url: "https://www.thepixelprince.com/art/the-moon-photography-wall-art-free-download" },
        { position: 2, name: "Life Is Short", url: "https://www.thepixelprince.com/art/life-is-short" },
      ],
    });
    expect(freeGallerySchema([]).mainEntity).toMatchObject({ numberOfItems: 0, itemListElement: [] });
  });

  it("stops the gallery breadcrumb at the gallery", () => {
    expect(freeGalleryBreadcrumb().itemListElement).toHaveLength(2);
  });
});
