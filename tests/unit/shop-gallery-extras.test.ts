import { describe, it, expect } from "vitest";
import { shopGalleryExtras, FRAMED_FEATURES_IMAGE, SIZE_GUIDE_IMAGE } from "@/config/shop-copy";

describe("gallery extras", () => {
  it("keeps the frame spec card away from an unframed poster", () => {
    for (const finish of ["unframed", "canvas", undefined, null]) {
      const urls = shopGalleryExtras(finish).map((i) => i.url);
      expect(urls).not.toContain(FRAMED_FEATURES_IMAGE.url);
      expect(urls).toContain(SIZE_GUIDE_IMAGE.url);
    }
  });

  it("shows it second to last when the framed finish is on screen", () => {
    const extras = shopGalleryExtras("framed");
    expect(extras).toEqual([FRAMED_FEATURES_IMAGE, SIZE_GUIDE_IMAGE]);
    // second to last of the whole gallery, since these are appended to the product's own photos
    expect(extras[extras.length - 2]).toBe(FRAMED_FEATURES_IMAGE);
  });

  it("gives every slide alt text, which is what a crawler and a screen reader read", () => {
    for (const finish of ["framed", "unframed"]) {
      for (const img of shopGalleryExtras(finish)) {
        expect(img.alt.length).toBeGreaterThan(20);
        expect(img.url.startsWith("/shop/")).toBe(true);
      }
    }
  });
});
