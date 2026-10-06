import { describe, it, expect } from "vitest";

import { buildCartCatalog, pairsWellWith, unavailableItems, type CartCatalog } from "@/lib/cart-catalog";
import type { Cart } from "@/lib/fourthwall-cart";
import type { FreeArt, PrintOffer } from "@/sanity/lib/client";

function offer(variants: string[], extra: Partial<PrintOffer> = {}): PrintOffer {
  return {
    provider: "fourthwall",
    finish: "unframed",
    sizes: variants.map((id, i) => ({ sizeId: ["8x10", "16x20"][i] ?? "18x24", priceCents: 2300 + i * 1000, providerVariantId: id })),
    ...extra,
  };
}

function art(id: string, category: string, offers: PrintOffer[], extra: Partial<FreeArt> = {}): FreeArt {
  return {
    _id: id,
    id,
    createdAt: "2026-09-01",
    title: id.replace(/-/g, " "),
    artist: "The Pixel Prince",
    description: "",
    previewImage: `https://cdn.sanity.io/${id}.png`,
    listing: "shop",
    kind: "single",
    offers,
    tags: [],
    category,
    ...extra,
  };
}

const prints = [
  art("brooklyn-map", "Maps", [offer(["b1", "b2"])]),
  art("queens-map", "Maps", [offer(["q1"])]),
  art("mario-poster", "Video Games", [offer(["m1"])]),
  art("old-etsy", "Maps", [offer(["e1"], { provider: "etsy" })]),
  art("retired", "Maps", [offer(["r1"], { active: false })]),
  art("map-pair", "Maps", [], { kind: "set" }),
];

function cartOf(...ids: string[]): Cart {
  return { id: "c1", items: ids.map((id) => ({ quantity: 1, variant: { id } })) };
}

describe("buildCartCatalog", () => {
  it("maps each live Fourthwall variant to its print", () => {
    const c = buildCartCatalog(prints);
    expect(c.variants).toEqual({ b1: "brooklyn-map", b2: "brooklyn-map", q1: "queens-map", m1: "mario-poster" });
  });

  it("suggests on-site singles only, with a from price", () => {
    const c = buildCartCatalog(prints);
    expect(c.prints.map((p) => p.slug)).toEqual(["brooklyn-map", "queens-map", "mario-poster"]);
    expect(c.prints.find((p) => p.slug === "brooklyn-map")?.fromCents).toBe(2300);
  });
});

describe("unavailableItems", () => {
  const catalog = buildCartCatalog(prints);

  it("flags a variant the shop no longer sells", () => {
    expect(unavailableItems(cartOf("b1", "r1", "gone"), catalog).map((i) => i.variant.id)).toEqual(["r1", "gone"]);
  });

  it("flags a sold-out variant even when it is in the catalog", () => {
    const cart: Cart = { id: "c1", items: [{ quantity: 1, variant: { id: "b1", stock: { type: "LIMITED", inStock: 0 } } }] };
    expect(unavailableItems(cart, catalog)).toHaveLength(1);
  });

  it("treats unlimited or unknown stock as in stock", () => {
    const cart: Cart = { id: "c1", items: [{ quantity: 1, variant: { id: "b1", stock: { type: "UNLIMITED" } } }] };
    expect(unavailableItems(cart, catalog)).toHaveLength(0);
  });

  it("flags nothing by catalog when the catalog is missing or empty", () => {
    expect(unavailableItems(cartOf("gone"), null)).toEqual([]);
    expect(unavailableItems(cartOf("gone"), { variants: {}, prints: [] })).toEqual([]);
  });
});

describe("pairsWellWith", () => {
  const catalog: CartCatalog = buildCartCatalog(prints);

  it("suggests the same category first and never what is already in the bag", () => {
    expect(pairsWellWith(cartOf("b1"), catalog).map((p) => p.slug)).toEqual(["queens-map", "mario-poster"]);
  });

  it("falls back to other categories when the category runs out", () => {
    expect(pairsWellWith(cartOf("m1"), catalog, 3).map((p) => p.slug)).toEqual(["brooklyn-map", "queens-map"]);
  });

  it("returns nothing for an empty bag or no catalog", () => {
    expect(pairsWellWith(cartOf(), catalog)).toEqual([]);
    expect(pairsWellWith(cartOf("b1"), null)).toEqual([]);
  });
});
