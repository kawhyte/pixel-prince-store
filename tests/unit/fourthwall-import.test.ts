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
      v('12" x 16"', 30, "v-skip"),
      v('8" x 10"', 23.0, "v1"),
      v('11" x 14"', 29.99, "v2"),
    ]);
    expect(sizes.map((s) => s.sizeId)).toEqual(["8x10", "11x14", "16x20"]);
    expect(sizes[0]).toMatchObject({ _key: "fw-8x10", priceCents: 2300, providerVariantId: "v1" });
    expect(sizes[2].priceCents).toBe(3699);
    expect(skipped).toEqual(['12" x 16"']);
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
