import { describe, it, expect } from "vitest";
import {
  sizeIdFromLabel,
  mapVariantsToSizes,
  stripHtml,
  inferCategory,
  inferKind,
  isImportable,
  slugify,
  sanityIdForFourthwallProduct,
  pickGalleryImages,
  type FwVariant,
  type FwProduct,
} from "@/lib/fourthwall-import";

const v = (size: string, price: number, id: string): FwVariant => ({
  id,
  unitPrice: { value: price, currency: "USD" },
  attributes: { size: { name: size } },
});

describe("fourthwall import helpers", () => {
  it("normalises size labels", () => {
    expect(sizeIdFromLabel('8" x 10"')).toBe("8x10");
    expect(sizeIdFromLabel("8x10")).toBe("8x10");
    expect(sizeIdFromLabel("18 × 24")).toBe("18x24");
    expect(sizeIdFromLabel("White")).toBeNull();
    expect(sizeIdFromLabel(undefined)).toBeNull();
  });

  it("maps ladder variants in ladder order, cents, and skips the rest", () => {
    const { sizes, skipped } = mapVariantsToSizes([
      v('16" x 20"', 36.99, "v3"),
      // Fourthwall offers sizes the shop does not sell, like this one
      v('10" x 10"', 30, "v-skip"),
      v('8" x 10"', 23.0, "v1"),
      v('11" x 14"', 29.99, "v2"),
    ]);
    expect(sizes.map((s) => s.sizeId)).toEqual(["8x10", "11x14", "16x20"]);
    expect(sizes[0]).toMatchObject({ _key: "fw-8x10", priceCents: 2300, providerVariantId: "v1" });
    expect(sizes[2].priceCents).toBe(3699);
    expect(skipped).toEqual(['10" x 10"']);
  });

  it("strips html", () => {
    expect(stripHtml("<p>test&nbsp;print</p>\n<ul><li>a</li></ul>")).toBe("test print a");
    expect(stripHtml(undefined)).toBe("");
  });

  it("infers category and kind from the title", () => {
    expect(inferCategory("Brooklyn Neighborhood Map Print")).toBe("Maps");
    expect(inferCategory("Retro Console Controller Print, 4 Colors")).toBe("Video Games");
    expect(inferCategory("Something Else")).toBeUndefined();
    expect(inferKind("Retro Console Print Set of 2")).toBe("set");
    expect(inferKind("Retro Console Print")).toBe("single");
  });

  it("filters importable products", () => {
    const base: FwProduct = { id: "p", name: "Real print", state: { type: "AVAILABLE" }, access: { type: "PUBLIC" } };
    expect(isImportable(base)).toBe(true);
    expect(isImportable({ ...base, name: "Test print" })).toBe(false);
    expect(isImportable({ ...base, name: "Test print" }, true)).toBe(true);
    expect(isImportable({ ...base, access: { type: "HIDDEN" } })).toBe(false);
  });

  it("picks up to three extra mockups from the first variant, skipping the preview", () => {
    const imgs = (ids: string[]) => ids.map((id) => ({ id, url: `https://x/${id}.webp` }));
    const p: FwProduct = {
      id: "p", name: "P",
      images: imgs(["a", "b", "c", "d", "e", "f"]),
      variants: [{ id: "v1", images: imgs(["a", "b", "c", "d"]) }, { id: "v2", images: imgs(["e", "f"]) }],
    };
    expect(pickGalleryImages(p).map((i) => i.id)).toEqual(["b", "c", "d"]);
    expect(pickGalleryImages({ id: "q", name: "Q", images: imgs(["a", "b"]) }).map((i) => i.id)).toEqual(["b"]);
    expect(pickGalleryImages({ id: "r", name: "R" })).toEqual([]);
  });

  it("builds stable ids and slugs", () => {
    expect(sanityIdForFourthwallProduct("abc")).toBe("fw-abc");
    expect(slugify('Pastel USA Map "with" Capitals!')).toBe("pastel-usa-map-with-capitals");
  });
});

describe("splitFinish", () => {
  it("reads the suffix convention and falls back to keywords", async () => {
    const { splitFinish } = await import("@/lib/fourthwall-import");
    expect(splitFinish("Sweden Map | Framed")).toEqual({ baseTitle: "Sweden Map", finish: "framed" });
    expect(splitFinish("Sweden Map |canvas")).toEqual({ baseTitle: "Sweden Map", finish: "canvas" });
    expect(splitFinish("Sweden Map | Unframed")).toEqual({ baseTitle: "Sweden Map", finish: "unframed" });
    expect(splitFinish("Sweden Map")).toEqual({ baseTitle: "Sweden Map", finish: "unframed" });
    expect(splitFinish("Sweden Map Framed Poster")).toEqual({ baseTitle: "Sweden Map Framed Poster", finish: "framed" });
  });
});

describe("frame colors", () => {
  it("keeps one variant per size, preferring Black", async () => {
    const { mapVariantsToSizes } = await import("@/lib/fourthwall-import");
    const v = (size: string, color: string, id: string) => ({ id, unitPrice: { value: 50 }, attributes: { size: { name: size }, color: { name: color } } });
    const { sizes } = mapVariantsToSizes([v('8" x 10"', "White", "w1"), v('8" x 10"', "Black", "b1"), v('8" x 10"', "Red Oak", "o1"), v('11" x 14"', "White", "w2")]);
    expect(sizes.map((s) => [s.sizeId, s.providerVariantId])).toEqual([["8x10", "b1"], ["11x14", "w2"]]);
  });
});

describe("artwork versions", () => {
  it("splits a version out of the product name and keeps ids stable across versions", async () => {
    const { splitVersion, splitProductName, sanityIdForArtwork } = await import("@/lib/fourthwall-import");
    expect(splitVersion("Moon (Ivory)")).toEqual({ title: "Moon", version: "Ivory" });
    expect(splitVersion("Moon")).toEqual({ title: "Moon", version: null });
    expect(splitVersion("(Ivory)")).toEqual({ title: "(Ivory)", version: null });
    // ratio joined the shape on 2026-09-17; an untagged name is the default, 4:5.
    expect(splitProductName("Moon (Midnight) | Framed")).toEqual({ title: "Moon", version: "Midnight", ratio: "4:5", finish: "framed" });
    expect(splitProductName("Moon | Canvas")).toEqual({ title: "Moon", version: null, ratio: "4:5", finish: "canvas" });

    const p = (id: string, name: string) => ({ id, name });
    const products = [p("m", "Moon (Midnight)"), p("mf", "Moon (Midnight) | Framed"), p("i", "Moon (Ivory)")];
    expect(sanityIdForArtwork(products)).toBe("fw-i");
    expect(sanityIdForArtwork([...products].reverse())).toBe("fw-i");
  });
});

describe("pickVariantPerSize", () => {
  it("keeps the black frame when a size repeats, and never drops a poster for its paper colour", async () => {
    const { pickVariantPerSize } = await import("@/lib/fourthwall-import");
    const make = (size: string, color: string | undefined, id: string) => ({
      id,
      unitPrice: { value: 10 },
      attributes: { size: { name: size }, ...(color ? { color: { name: color } } : {}) },
    });

    // framed: every size once per frame colour
    const framed = pickVariantPerSize([
      make('8" x 10"', "White", "w1"),
      make('8" x 10"', "Black", "b1"),
      make('8" x 10"', "Red Oak", "o1"),
      make('11" x 14"', "White", "w2"),
    ]);
    expect(framed.get("8x10")?.id).toBe("b1");
    expect(framed.get("11x14")?.id).toBe("w2"); // only one, so it stays

    // poster: the colour is the paper, and there is no black
    const poster = pickVariantPerSize([make('8" x 10"', "White", "p1"), make('16" x 20"', undefined, "p2")]);
    expect([...poster.keys()]).toEqual(["8x10", "16x20"]);
    expect(poster.get("8x10")?.id).toBe("p1");
  });
});

describe("room photos on an artwork that already exists", () => {
  it("only writes on an explicit --reset-images", async () => {
    const { shouldReplaceGallery } = await import("@/lib/fourthwall-import");
    // The regression: Kenny deleted Brooklyn's Fourthwall renders, the gallery went to 0, and the
    // next sync read that as "never seeded" and put three back. An empty gallery is a decision.
    expect(shouldReplaceGallery({ resetImages: false, incomingPhotos: 3 })).toBe(false);
    expect(shouldReplaceGallery({ resetImages: true, incomingPhotos: 3 })).toBe(true);
    // Nothing to copy means nothing to do, so --reset-images cannot blank a gallery by accident.
    expect(shouldReplaceGallery({ resetImages: true, incomingPhotos: 0 })).toBe(false);
    expect(shouldReplaceGallery({ resetImages: false, incomingPhotos: 0 })).toBe(false);
  });
});

describe("inferCategory and plurals", () => {
  it("matches a plural title, which is how most of them are written", async () => {
    const { inferCategory } = await import("@/lib/fourthwall-import");
    // The bug: \bcontroller\b cannot match "Controllers", so both retro prints imported with no
    // category, which quietly keeps a print off every collection page.
    expect(inferCategory("Retro Controllers")).toBe("Video Games");
    expect(inferCategory("Retro Consoles")).toBe("Video Games");
    expect(inferCategory("Sweden Maps")).toBe("Maps");
    expect(inferCategory("Cat Memes")).toBe("Funny");
    // "Gaming" is not "game" plus an s, and it is how half these titles are written.
    expect(inferCategory("Retro Gaming Set of 2")).toBe("Video Games");
    expect(inferCategory("Gaming Room Prints")).toBe("Video Games");
    // First rule wins, and a gaming meme is filed under Video Games. Worth knowing rather than
    // discovering: the order in inferCategory is the tie-break.
    expect(inferCategory("Gaming Memes")).toBe("Video Games");
    expect(inferCategory("Wild Flowers")).toBe("Botanical");
  });

  it("still matches the singular, and still gives up on a title with no clue in it", async () => {
    const { inferCategory } = await import("@/lib/fourthwall-import");
    expect(inferCategory("Video Game Controller Evolution")).toBe("Video Games");
    expect(inferCategory("Brooklyn Neighborhood Map")).toBe("Maps");
    expect(inferCategory("Minimalist Moon")).toBe("Minimalist");
    expect(inferCategory("Something Else Entirely")).toBeUndefined();
  });
});

describe("aspect ratio in a product name", () => {
  it("strips the tag so every ratio of one artwork shares a title", async () => {
    const { splitProductName } = await import("@/lib/fourthwall-import");
    // The tag sits between the version and the finish. Strip order matters: splitVersion matches a
    // trailing parenthesis that the tag would otherwise hide.
    expect(splitProductName("Moon (Midnight) [2x3] | Framed")).toEqual({ title: "Moon", version: "Midnight", ratio: "2:3", finish: "framed" });
    expect(splitProductName("Sweden Map [3x4]")).toEqual({ title: "Sweden Map", version: null, ratio: "3:4", finish: "unframed" });
    expect(splitProductName("Sweden Map [11x14] | Framed")).toEqual({ title: "Sweden Map", version: null, ratio: "11:14", finish: "framed" });
  });

  it("leaves an unrecognised tag in the title rather than guessing", async () => {
    const { splitProductName } = await import("@/lib/fourthwall-import");
    // Silently dropping it would merge the product into an artwork it does not belong to.
    const got = splitProductName("Sweden Map [9x16]");
    expect(got.title).toBe("Sweden Map [9x16]");
    expect(got.ratio).toBe("4:5");
  });

  it("keeps the Sanity id on the default-ratio unframed product", async () => {
    const { sanityIdForArtwork } = await import("@/lib/fourthwall-import");
    const p = (id: string, name: string) => ({ id, name });
    // Adding a [2x3] sibling to an artwork that already exists must not move its id, or everything
    // Kenny wrote in Studio is orphaned onto a second artwork.
    const before = [p("a", "Sweden Map"), p("af", "Sweden Map | Framed")];
    const after = [...before, p("b", "Sweden Map [2x3]"), p("bf", "Sweden Map [2x3] | Framed")];
    expect(sanityIdForArtwork(before)).toBe("fw-a");
    expect(sanityIdForArtwork(after)).toBe("fw-a");
    expect(sanityIdForArtwork([...after].reverse())).toBe("fw-a");
  });
});
