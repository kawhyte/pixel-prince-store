import { describe, it, expect } from "vitest";
import { mapGalleryImages } from "@/lib/gallery-images";
import { offerImageAlt, versionGallery } from "@/lib/commerce";
import { imageAlt } from "@/lib/listing-copy";

/**
 * Alt text is a warning in Studio, never a blocker, so every path that can be left blank has to
 * have something behind it. A blank alt is worse than an imperfect one: a screen reader reads the
 * file name, and a crawler sees nothing.
 */
describe("no image can reach the page with a blank alt", () => {
  it("room photos fall back to the artwork title", () => {
    const mapped = mapGalleryImages(
      [{ asset: {}, alt: "   " }, { asset: {} }, { asset: {}, alt: "a real one" }],
      () => "x.jpg",
      "Brooklyn Neighborhood Map",
    );
    expect(mapped.map((m) => m.alt)).toEqual([
      "Brooklyn Neighborhood Map",
      "Brooklyn Neighborhood Map",
      "a real one",
    ]);
    expect(mapped.every((m) => m.alt.trim().length > 0)).toBe(true);
  });

  it("an offer photo with no alt hands back undefined so the caller substitutes", () => {
    const offer = { provider: "fourthwall" as const, finish: "framed" as const, mockupUrl: "m.jpg", mockupAlt: "  ", sizes: [] };
    expect(offerImageAlt(offer)).toBeUndefined();
    // what the page uses instead is never blank
    const generated = imageAlt({ title: "Brooklyn Neighborhood Map", version: "Bright", finish: "framed", kind: "main" });
    expect(generated.trim().length).toBeGreaterThan(0);
  });

  it("the generated line stays non-empty even with nothing but a title", () => {
    for (const kind of ["main", "room"] as const) {
      expect(imageAlt({ title: "Brooklyn Neighborhood Map", kind }).trim().length).toBeGreaterThan(0);
    }
  });

  it("a version photo with no alt still carries a url, so the page can substitute", () => {
    const art = {
      offers: [
        { provider: "fourthwall" as const, version: "Bright", finish: "unframed" as const, sizes: [], gallery: [{ url: "b.jpg" }] },
      ],
    };
    const got = versionGallery(art, "Bright", "unframed");
    expect(got).toEqual([{ url: "b.jpg" }]);
    expect(got[0].alt).toBeUndefined();
  });
});
