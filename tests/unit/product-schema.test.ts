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

// A shopper increasingly asks an assistant "do you do 16x20, and what's the framed one?" rather
// than scrolling a size picker. The aggregate answers with a range; only the rows answer that.
describe('per-size offers inside the aggregate', () => {
  const art = {
    id: 'brooklyn-neighborhood-map',
    title: 'Brooklyn Neighborhood Map',
    description: 'A map of every Brooklyn neighborhood.',
    kind: 'single',
    offers: [
      {
        provider: 'fourthwall', finish: 'unframed', version: 'Earth',
        sizes: [
          { sizeId: '8x10', priceCents: 2399, providerVariantId: 'v-earth-un-8x10' },
          { sizeId: '24x36', priceCents: 4500, providerVariantId: 'v-earth-un-24x36' },
        ],
      },
      {
        provider: 'fourthwall', finish: 'framed', version: 'Earth',
        sizes: [{ sizeId: '8x10', priceCents: 5800, providerVariantId: 'v-earth-fr-8x10' }],
      },
    ],
  } as never

  it('lists one offer per buyable row, with the size and finish in the name', () => {
    const schema = shopPrintSchema(art) as never as { offers: { offers: { name: string; price: string; sku: string }[] } }
    const rows = schema.offers.offers
    expect(rows).toHaveLength(3)
    const byPrice = Object.fromEntries(rows.map((r) => [r.sku, r]))
    expect(byPrice['v-earth-un-8x10'].price).toBe('23.99')
    expect(byPrice['v-earth-un-8x10'].name).toContain('unframed')
    expect(byPrice['v-earth-fr-8x10'].price).toBe('58.00')
    expect(byPrice['v-earth-fr-8x10'].name).toContain('framed')
    expect(byPrice['v-earth-un-24x36'].name).toContain('Earth')
  })

  it('keeps the price range Google reads for merchant listings', () => {
    const schema = shopPrintSchema(art) as never as { offers: { lowPrice: string; highPrice: string; offerCount: number } }
    expect(schema.offers.lowPrice).toBe('23.99')
    expect(schema.offers.highPrice).toBe('58.00')
    expect(schema.offers.offerCount).toBe(3)
  })

  it('never invents a row the page cannot sell', () => {
    const rows = (shopPrintSchema(art) as never as { offers: { offers: { price: string }[] } }).offers.offers
    for (const r of rows) expect(Number(r.price)).toBeGreaterThan(0)
  })
})

describe('the FAQ the page already shows', () => {
  it('is published as FAQPage, question and answer both', async () => {
    const { shopPrintFaqSchema } = await import('@/lib/product-schema')
    const { SHOP_SHIPPING_FAQ } = await import('@/config/shop-copy')
    const schema = shopPrintFaqSchema() as { '@type': string; mainEntity: { name: string; acceptedAnswer: { text: string } }[] }
    expect(schema['@type']).toBe('FAQPage')
    expect(schema.mainEntity).toHaveLength(SHOP_SHIPPING_FAQ.length)
    // every marked-up answer is one the accordion renders; schema must never outrun the page
    for (const q of schema.mainEntity) {
      const source = SHOP_SHIPPING_FAQ.find((f) => f.q === q.name)
      expect(source, `"${q.name}" is not a question the page shows`).toBeTruthy()
      expect(q.acceptedAnswer.text).toBe(source!.a)
    }
  })
})
