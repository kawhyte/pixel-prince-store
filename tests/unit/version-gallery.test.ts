import { describe, it, expect } from "vitest";
import { versionGallery } from "@/lib/commerce";

const offer = (version: string, finish: "unframed" | "framed", gallery?: { url: string; alt?: string }[]) => ({
  provider: "fourthwall" as const,
  version,
  finish,
  sizes: [{ sizeId: "8x10", priceCents: 2399 }],
  ...(gallery ? { gallery } : {}),
});

const bright = [{ url: "bright-1.jpg", alt: "bright on a wall" }];
const earth = [{ url: "earth-1.jpg", alt: "earth on a wall" }];

describe("per-version gallery", () => {
  it("shows the photos on the offer a buyer is actually looking at", () => {
    const art = { offers: [offer("Earth", "unframed", earth), offer("Bright", "unframed", bright)] };
    expect(versionGallery(art, "Bright", "unframed")).toEqual(bright);
    expect(versionGallery(art, "Earth", "unframed")).toEqual(earth);
  });

  it("never lends one finish's photos to the other, whatever the colorway", () => {
    // This used to lend them, and it put a framed print on a wall into the Unframed gallery,
    // promising a frame that is not in the box. A photo of a framed product is only true of the
    // framed product; anything true of both belongs in the artwork's room photos.
    const art = { offers: [offer("Bright", "unframed", bright), offer("Bright", "framed")] };
    expect(versionGallery(art, "Bright", "framed")).toEqual([]);
    expect(versionGallery(art, "Bright", "unframed")).toEqual(bright);
  });

  it("never lends one colorway's photos to another", () => {
    const art = { offers: [offer("Earth", "unframed", earth), offer("Bright", "unframed")] };
    expect(versionGallery(art, "Bright", "unframed")).toEqual([]);
  });

  it("lets a single finish override the colorway's set", () => {
    const framedOnly = [{ url: "bright-framed.jpg", alt: "bright, framed" }];
    const art = { offers: [offer("Bright", "unframed", bright), offer("Bright", "framed", framedOnly)] };
    expect(versionGallery(art, "Bright", "framed")).toEqual(framedOnly);
    expect(versionGallery(art, "Bright", "unframed")).toEqual(bright);
  });

  it("is empty rather than broken when nobody has added photos", () => {
    const art = { offers: [offer("Earth", "unframed"), offer("Earth", "framed")] };
    expect(versionGallery(art, "Earth", "unframed")).toEqual([]);
    expect(versionGallery({ offers: [] }, "Earth", "unframed")).toEqual([]);
    expect(versionGallery(art, null, null)).toEqual([]);
  });

  it("drops an entry whose image never resolved, so no slide renders blank", () => {
    const holed = [{ url: "", alt: "missing" }, { url: "ok.jpg", alt: "fine" }];
    const art = { offers: [offer("Bright", "unframed", holed)] };
    expect(versionGallery(art, "Bright", "unframed")).toEqual([{ url: "ok.jpg", alt: "fine" }]);
  });
});
