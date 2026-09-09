import { describe, it, expect } from "vitest";
import {
  getActiveOffer,
  getOnSiteOffer,
  orderedSizes,
  fromPriceCents,
  formatPrice,
  isShopPrint,
  buildFourthwallCheckoutUrl,
  resolveCheckout,
  priceRangeCents,
  cardCommerce,
  isNewPrint,
  popularSizeId,
} from "@/lib/commerce";
import { inchesLabel } from "@/config/commerce";
import type { PrintOffer } from "@/sanity/lib/client";

const fw: PrintOffer = {
  provider: "fourthwall",
  providerProductId: "prod_1",
  sizes: [
    { sizeId: "16x20", priceCents: 3699, providerVariantId: "v2" },
    { sizeId: "8x10", priceCents: 2399, providerVariantId: "v1", popular: true },
  ],
};
const etsy: PrintOffer = { provider: "etsy", checkoutUrl: "https://www.etsy.com/listing/1" };

describe("commerce helpers", () => {
  it("prefers fourthwall over etsy", () => {
    expect(getActiveOffer({ offers: [etsy, fw] })?.provider).toBe("fourthwall");
  });
  it("skips inactive offers", () => {
    expect(getActiveOffer({ offers: [{ ...fw, active: false }, etsy] })?.provider).toBe("etsy");
  });
  it("returns null with no offers", () => {
    expect(getActiveOffer({ offers: [] })).toBeNull();
    expect(getOnSiteOffer({ offers: [etsy] })).toBeNull();
  });
  it("orders sizes by the ladder", () => {
    expect(orderedSizes(fw).map((s) => s.sizeId)).toEqual(["8x10", "16x20"]);
  });
  it("treats only listing=shop as a shop print", () => {
    expect(isShopPrint({ listing: "free" })).toBe(false);
    expect(isShopPrint({ listing: "shop" })).toBe(true);
  });
  it("computes from-price and formats it", () => {
    expect(fromPriceCents(fw)).toBe(2399);
    expect(fromPriceCents(etsy)).toBeNull();
    expect(formatPrice(2399)).toBe("$23.99");
  });
});

describe("checkout adapter", () => {
  const domain = "checkout.example.com";
  it("builds a Fourthwall direct checkout link with utm", () => {
    const href = buildFourthwallCheckoutUrl("11111111-1111-1111-1111-111111111111", "print-foo", domain)!;
    const u = new URL(href);
    expect(u.origin + u.pathname).toBe("https://checkout.example.com/cart/checkout");
    expect(u.searchParams.get("products")).toBe("11111111-1111-1111-1111-111111111111:1");
    expect(u.searchParams.get("currency")).toBe("USD");
    expect(u.searchParams.get("utm_source")).toBe("pixelprince");
    expect(u.searchParams.get("utm_campaign")).toBe("print-foo");
  });
  it("returns null without a checkout domain or variant id", () => {
    expect(buildFourthwallCheckoutUrl("v1", "c", "")).toBeNull();
    expect(buildFourthwallCheckoutUrl("", "c", domain)).toBeNull();
  });
  it("resolves fourthwall by size, etsy by link, stripe and inactive to null", () => {
    expect(resolveCheckout(fw, "8x10", "c", domain)?.href).toContain("products=v1%3A1");
    expect(resolveCheckout(fw, "8x10", "c", domain)?.external).toBe(false);
    expect(resolveCheckout(fw, "24x36", "c", domain)).toBeNull();
    expect(resolveCheckout(etsy, null, "c", domain)?.external).toBe(true);
    expect(resolveCheckout(etsy, null, "c", domain)?.href).toContain("utm_campaign=c");
    expect(resolveCheckout({ provider: "stripe", providerProductId: "x" }, "8x10", "c", domain)).toBeNull();
    expect(resolveCheckout({ ...fw, active: false }, "8x10", "c", domain)).toBeNull();
  });
  it("computes the price range", () => {
    expect(priceRangeCents(fw)).toEqual({ min: 2399, max: 3699 });
    expect(priceRangeCents(etsy)).toBeNull();
  });
});

describe("cardCommerce", () => {
  it("routes free prints to /art with the FREE row", () => {
    expect(cardCommerce({ id: "moon", listing: "free", offers: [] })).toEqual({ href: "/art/moon", meta: "Digital print", value: "FREE" });
  });
  it("routes shop prints to /prints with a from-price", () => {
    expect(cardCommerce({ id: "sweden", listing: "shop", offers: [fw] })).toEqual({ href: "/prints/sweden", meta: "Art print", value: "From $23.99" });
    expect(cardCommerce({ id: "sweden", listing: "shop", offers: [] }).value).toBe("");
  });
});

describe("isNewPrint", () => {
  const now = Date.parse("2026-09-08T12:00:00Z");
  it("is new within 30 days and not after", () => {
    expect(isNewPrint("2026-09-01T00:00:00Z", 30, now)).toBe(true);
    expect(isNewPrint("2026-07-01T00:00:00Z", 30, now)).toBe(false);
    expect(isNewPrint(undefined, 30, now)).toBe(false);
    expect(isNewPrint("nope", 30, now)).toBe(false);
  });
});

describe("popularSizeId + inchesLabel", () => {
  it("prefers the Studio flag, then 18x24, then the first size", () => {
    expect(popularSizeId(fw)).toBe("8x10"); // fw fixture flags 8x10
    const noFlag: PrintOffer = { provider: "fourthwall", sizes: [
      { sizeId: "8x10", priceCents: 2399 }, { sizeId: "18x24", priceCents: 3999 }, { sizeId: "24x36", priceCents: 4999 },
    ] };
    expect(popularSizeId(noFlag)).toBe("18x24");
    const small: PrintOffer = { provider: "fourthwall", sizes: [{ sizeId: "11x14", priceCents: 2999 }, { sizeId: "8x10", priceCents: 2399 }] };
    expect(popularSizeId(small)).toBe("8x10"); // ladder order, no 18x24 available
    expect(popularSizeId(etsy)).toBeNull();
  });
  it("spells inches out", () => {
    expect(inchesLabel("18x24")).toBe("18″ × 24″");
    expect(inchesLabel("odd")).toBe("odd");
  });
});


describe("finishes", () => {
  const framed: PrintOffer = { provider: "fourthwall", finish: "framed", providerProductId: "p2", sizes: [{ sizeId: "8x10", priceCents: 5800, providerVariantId: "f1" }] };
  const canvas: PrintOffer = { provider: "fourthwall", finish: "canvas", providerProductId: "p3", sizes: [{ sizeId: "11x14", priceCents: 5500, providerVariantId: "c1" }] };
  it("lists finishes in order and resolves the default", async () => {
    const { getOffersByFinish, resolveFinish, getActiveOffer, fromPriceAcrossFinishes } = await import("@/lib/commerce");
    const art = { offers: [canvas, framed, fw] };
    expect(getOffersByFinish(art).map((x) => x.finish)).toEqual(["unframed", "framed", "canvas"]);
    expect(resolveFinish(art)).toBe("unframed");
    expect(resolveFinish({ ...art, defaultFinish: "framed" })).toBe("framed");
    expect(resolveFinish(art, "canvas")).toBe("canvas");
    expect(resolveFinish({ offers: [canvas] })).toBe("canvas");
    expect(getActiveOffer(art, "framed")?.providerProductId).toBe("p2");
    expect(getActiveOffer({ ...art, defaultFinish: "canvas" })?.providerProductId).toBe("p3");
    expect(fromPriceAcrossFinishes(art)).toBe(2399);
    expect(resolveFinish({ offers: [etsy] })).toBeNull();
  });
});

describe("artwork versions", () => {
  it("lists versions, resolves the first, and picks the offer for a version and finish", async () => {
    const { getVersions, resolveVersion, resolveFinish, getActiveOffer, getOffersByFinish } = await import("@/lib/commerce");
    const row = (cents: number) => [{ sizeId: "8x10", priceCents: cents, providerVariantId: "v" }];
    const ivory = { provider: "fourthwall" as const, finish: "unframed" as const, version: "Ivory", sizes: row(2500) };
    const ivoryFramed = { provider: "fourthwall" as const, finish: "framed" as const, version: "Ivory", sizes: row(5035) };
    const midnight = { provider: "fourthwall" as const, finish: "unframed" as const, version: "Midnight", sizes: row(2500) };
    const art = { offers: [ivory, ivoryFramed, midnight] };

    expect(getVersions(art).map((x) => x.version)).toEqual(["Ivory", "Midnight"]);
    expect(resolveVersion(art)).toBe("Ivory");
    expect(resolveVersion(art, "Midnight")).toBe("Midnight");
    expect(resolveVersion(art, "Nope")).toBe("Ivory");
    expect(resolveVersion({ offers: [{ provider: "fourthwall", finish: "unframed", sizes: row(2500) }] })).toBeNull();

    // a version only shows the finishes it is sold in
    expect(getOffersByFinish(art, "Ivory").map((x) => x.finish)).toEqual(["unframed", "framed"]);
    expect(getOffersByFinish(art, "Midnight").map((x) => x.finish)).toEqual(["unframed"]);
    expect(resolveFinish(art, "framed", "Midnight")).toBe("unframed");

    expect(getActiveOffer(art, "framed", "Ivory")).toBe(ivoryFramed);
    expect(getActiveOffer(art, "unframed", "Midnight")).toBe(midnight);
    expect(getActiveOffer(art)).toBe(ivory);
    // asking for a finish this version does not sell falls back inside the version, never to another one
    expect(getActiveOffer(art, "framed", "Midnight")).toBe(midnight);
  });
});

describe("a finish with a shorter size ladder", () => {
  it("shows only its own sizes and preselects 18x24, so canvas without 8x10 stays valid", async () => {
    const { getActiveOffer, orderedSizes, popularSizeId, fromPriceCents } = await import("@/lib/commerce");
    const size = (sizeId: string, priceCents: number) => ({ sizeId, priceCents, providerVariantId: `v-${sizeId}` });
    const unframed = {
      provider: "fourthwall" as const,
      finish: "unframed" as const,
      sizes: [size("8x10", 2399), size("11x14", 2700), size("16x20", 3400), size("18x24", 3700), size("24x36", 4500)],
    };
    // Kenny's Etsy canvas ladder has no 8x10
    const canvas = {
      provider: "fourthwall" as const,
      finish: "canvas" as const,
      sizes: [size("11x14", 5500), size("16x20", 11000), size("18x24", 13000), size("24x36", 19500)],
    };
    const art = { offers: [unframed, canvas] };

    expect(orderedSizes(getActiveOffer(art, "canvas")!).map((s) => s.sizeId)).toEqual(["11x14", "16x20", "18x24", "24x36"]);
    expect(orderedSizes(getActiveOffer(art, "unframed")!)).toHaveLength(5);
    // switching finish never leaves a size the finish does not sell selected
    expect(popularSizeId(getActiveOffer(art, "canvas"))).toBe("18x24");
    expect(popularSizeId(getActiveOffer(art, "unframed"))).toBe("18x24");
    expect(fromPriceCents(getActiveOffer(art, "canvas"))).toBe(5500);
  });
});
