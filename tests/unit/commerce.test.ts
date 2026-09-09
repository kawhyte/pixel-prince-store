import { describe, it, expect } from "vitest";
import { getActiveOffer, getOnSiteOffer, orderedSizes, fromPriceCents, formatPrice } from "@/lib/commerce";
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
  it("computes from-price and formats it", () => {
    expect(fromPriceCents(fw)).toBe(2399);
    expect(fromPriceCents(etsy)).toBeNull();
    expect(formatPrice(2399)).toBe("$23.99");
  });
});
