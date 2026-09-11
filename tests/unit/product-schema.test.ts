import { describe, it, expect } from "vitest";

import { DELIVERY_DAYS_MAX, DELIVERY_DAYS_MIN } from "@/config/support";
import { priceSpanAcrossOffers, schemaImages, shopPrintBreadcrumb, shopPrintSchema } from "@/lib/product-schema";
import type { FreeArt, PrintOffer } from "@/sanity/lib/client";

function offer(over: Partial<PrintOffer> = {}): PrintOffer {
  return {
    provider: "fourthwall",
    finish: "unframed",
    active: true,
    sizes: [
      { sizeId: "8x10", priceCents: 2399 },
      { sizeId: "24x36", priceCents: 4999 },
    ],
    ...over,
  };
}

function art(over: Partial<FreeArt> = {}): FreeArt {
  return {
    _id: "a1",
    id: "sweden-map",
    createdAt: "2026-01-01",
    title: "Sweden Map",
    artist: "The Pixel Prince",
    description: "A map of Sweden.",
    previewImage: "https://cdn/preview.jpg",
    detailImage: "https://cdn/detail.jpg",
    listing: "shop",
    kind: "single",
    offers: [offer()],
    tags: [],
    ...over,
  } as FreeArt;
}

describe("shop print structured data", () => {
  it("spans every finish, not only the one the page opens on", () => {
    const both = art({
      offers: [
        offer(),
        offer({ finish: "framed", sizes: [{ sizeId: "8x10", priceCents: 5035 }, { sizeId: "24x36", priceCents: 10441 }] }),
      ],
    });
    expect(priceSpanAcrossOffers(both)).toEqual({ min: 2399, max: 10441, count: 4 });

    const schema = shopPrintSchema(both);
    expect(schema.offers).toMatchObject({
      "@type": "AggregateOffer",
      lowPrice: "23.99",
      highPrice: "104.41",
      priceCurrency: "USD",
      offerCount: 4,
      availability: "https://schema.org/InStock",
      itemCondition: "https://schema.org/NewCondition",
    });
  });

  it("counts every version's sizes", () => {
    const versioned = art({
      offers: [
        offer({ version: "Earth" }),
        offer({ version: "Bright", sizes: [{ sizeId: "8x10", priceCents: 2599 }] }),
      ],
    });
    expect(priceSpanAcrossOffers(versioned)).toEqual({ min: 2399, max: 4999, count: 3 });
    expect(shopPrintSchema(versioned).color).toEqual(["Earth", "Bright"]);
  });

  it("declares free US shipping and the delivery window from config", () => {
    const shipping = (shopPrintSchema(art()).offers as Record<string, Record<string, unknown>>).shippingDetails;
    expect(shipping).toMatchObject({
      shippingRate: { value: "0.00", currency: "USD" },
      shippingDestination: { addressCountry: "US" },
    });
    expect(shipping.deliveryTime).toMatchObject({
      handlingTime: { minValue: 0, maxValue: 0, unitCode: "DAY" },
      transitTime: { minValue: DELIVERY_DAYS_MIN, maxValue: DELIVERY_DAYS_MAX, unitCode: "DAY" },
    });
  });

  it("states the made-to-order return position rather than leaving it unknown", () => {
    const policy = (shopPrintSchema(art()).offers as Record<string, Record<string, unknown>>).hasMerchantReturnPolicy;
    expect(policy).toMatchObject({
      "@type": "MerchantReturnPolicy",
      applicableCountry: "US",
      returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
      merchantReturnLink: "https://www.thepixelprince.com/shipping-returns",
    });
  });

  it("never claims a per-product rating from the shop-wide review score", () => {
    const schema = shopPrintSchema(art());
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("review");
  });

  it("omits offers entirely when nothing is priced", () => {
    expect(priceSpanAcrossOffers(art({ offers: [] }))).toBeNull();
    expect(shopPrintSchema(art({ offers: [] }))).not.toHaveProperty("offers");
  });

  it("lists the page's photos once each, mockups included", () => {
    const withPhotos = art({
      offers: [offer({ mockupUrl: "https://cdn/mockup.jpg" }), offer({ finish: "framed", mockupUrl: "https://cdn/framed.jpg" })],
      galleryImages: [{ url: "https://cdn/room.jpg" }, { url: "https://cdn/detail.jpg" }],
    } as Partial<FreeArt>);
    const images = schemaImages(withPhotos);
    expect(images).toEqual([
      "https://cdn/detail.jpg",
      "https://cdn/preview.jpg",
      "https://cdn/mockup.jpg",
      "https://cdn/framed.jpg",
      "https://cdn/room.jpg",
    ]);
  });

  it("puts the print third in the breadcrumb", () => {
    expect(shopPrintBreadcrumb(art()).itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.thepixelprince.com/" },
      { "@type": "ListItem", position: 2, name: "Prints", item: "https://www.thepixelprince.com/prints" },
      { "@type": "ListItem", position: 3, name: "Sweden Map", item: "https://www.thepixelprince.com/prints/sweden-map" },
    ]);
  });
});
