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
} from "@/lib/commerce";
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

