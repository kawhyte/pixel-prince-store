/**
 * Structured data for a shop print page.
 *
 * The page already declared a Product with an AggregateOffer, which is enough for Google to
 * understand what the page sells and nothing more. Everything below is a merchant-listing
 * property Google reads for the shopping surfaces: free shipping, the arrival window, the
 * returns position, condition and sku. They are all facts the page already states in words;
 * this only says them again in a form a crawler can act on.
 *
 * Two things deliberately left out:
 *
 *   - `aggregateRating`. The 4.9 from 1,900+ reviews is the whole Etsy shop's, not this print's.
 *     Google requires a product rating to be about that product, and attaching a shop-wide score
 *     to every listing is the exact pattern that gets rich results pulled.
 *   - `priceValidUntil`. The page is served from a 60-second cache, so a date computed at render
 *     would be the cached date, not today's. See `lib/delivery.ts` for the same trade-off.
 */
import { CURRENCY } from "@/config/commerce";
import { DAMAGE_CLAIM_DAYS, DELIVERY_DAYS_MAX, DELIVERY_DAYS_MIN } from "@/config/support";
import { getOffersByFinish, getVersions, offerImage } from "@/lib/commerce";
import { isSet, sellableSet, setFinishes, setSizeRows } from "@/lib/sets";
import type { FreeArt, PrintOffer } from "@/sanity/lib/client";

export const SITE_URL = "https://www.thepixelprince.com";
export const BRAND_NAME = "The Pixel Prince";

/** Paper stock, stated once here and in SHOP_FEATURES; Google reads `material` on merchant listings. */
const PRINT_MATERIAL = "Museum-grade 189 gsm matte paper";

/** Every offer on the artwork, across finishes and versions, not just the one the page opens on. */
function allOffers(art: Pick<FreeArt, "offers" | "defaultVersion">): PrintOffer[] {
  const versions = getVersions(art);
  const keys = versions.length > 0 ? versions.map((v) => v.version) : [null];
  const seen = new Set<PrintOffer>();
  for (const version of keys) {
    for (const { offer } of getOffersByFinish(art, version)) seen.add(offer);
  }
  return [...seen];
}

export interface PriceSpan {
  min: number;
  max: number;
  /** how many buyable size rows there are in total, which is what `offerCount` means */
  count: number;
}

/**
 * The real price span of the listing. `priceRangeCents` covers one offer, so on a print whose
 * framed finish costs twice the poster it reported a ceiling the page itself contradicts two
 * clicks later. A price in structured data that the landing page does not show is the one
 * merchant-listing error Google acts on.
 */
export function priceSpanAcrossOffers(
  art: Pick<FreeArt, "offers" | "defaultVersion"> & Pick<FreeArt, "kind" | "members">,
): PriceSpan | null {
  // A set has no offers of its own, so the span is its members added up at every size it can be
  // made in (PLAN-54). Without this it declares no price at all, and a Product with no offer is
  // the one thing a shopping crawler cannot use.
  if (isSet(art) && sellableSet(art)) {
    const totals = setFinishes(art).flatMap((f) => setSizeRows(art, f).map((r) => r.priceCents));
    return totals.length > 0 ? { min: Math.min(...totals), max: Math.max(...totals), count: totals.length } : null;
  }
  let min = Infinity;
  let max = -Infinity;
  let count = 0;
  for (const offer of allOffers(art)) {
    for (const size of offer.sizes ?? []) {
      if (!Number.isFinite(size.priceCents)) continue;
      min = Math.min(min, size.priceCents);
      max = Math.max(max, size.priceCents);
      count++;
    }
  }
  return count > 0 ? { min, max, count } : null;
}

/** Product photos in the order a reader meets them: page hero, card, per-finish mockups, room shots. */
export function schemaImages(art: FreeArt): string[] {
  const urls = [
    art.detailImage,
    art.previewImage,
    ...allOffers(art).map((offer) => offerImage(offer)),
    ...(art.galleryImages ?? []).map((g) => g.url),
  ];
  return urls.filter((url, i, all): url is string => !!url && all.indexOf(url) === i);
}

/**
 * Free US shipping, as a shipping rate rather than a sentence.
 *
 * `config/support.ts` records the total promise and not how it splits between printing and post,
 * so handling is declared as zero and the whole window as transit. Google adds the two to get the
 * arrival date it displays, so the number a shopper sees is right; if the split is ever recorded,
 * move the printing days into handlingTime.
 *
 * These are business days, which is the convention Google reads these fields in, and since
 * 2026-09-11 it is also what the promise actually means.
 */
function shippingDetails() {
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: "0.00", currency: CURRENCY },
    shippingDestination: { "@type": "DefinedRegion", addressCountry: "US" },
    deliveryTime: {
      "@type": "ShippingDeliveryTime",
      handlingTime: { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" },
      transitTime: {
        "@type": "QuantitativeValue",
        minValue: DELIVERY_DAYS_MIN,
        maxValue: DELIVERY_DAYS_MAX,
        unitCode: "DAY",
      },
    },
  };
}

/**
 * Made to order, so no change-of-mind returns; a damaged print is replaced free instead. Saying
 * that plainly is better than leaving it blank, which Google reads as an unknown policy and which
 * a shopper reads as a worse one than we actually offer.
 */
function returnPolicy() {
  return {
    "@type": "MerchantReturnPolicy",
    applicableCountry: "US",
    returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
    merchantReturnLink: `${SITE_URL}/shipping-returns`,
    description: `Made to order, so we do not take change-of-mind returns. Damaged or misprinted orders are reprinted free within ${DAMAGE_CLAIM_DAYS} days of delivery.`,
  };
}

export function shopPrintSchema(art: FreeArt): Record<string, unknown> {
  const url = `${SITE_URL}/prints/${art.id}`;
  const span = priceSpanAcrossOffers(art);
  const versions = getVersions(art).map((v) => v.version);

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: art.title,
    description: art.description,
    image: schemaImages(art),
    url,
    sku: art.id,
    brand: { "@type": "Brand", name: BRAND_NAME },
    material: PRINT_MATERIAL,
    ...(art.category ? { category: art.category } : {}),
    ...(versions.length > 1 ? { color: versions } : {}),
    ...(span
      ? {
          offers: {
            "@type": "AggregateOffer",
            lowPrice: (span.min / 100).toFixed(2),
            highPrice: (span.max / 100).toFixed(2),
            priceCurrency: CURRENCY,
            offerCount: span.count,
            availability: "https://schema.org/InStock",
            itemCondition: "https://schema.org/NewCondition",
            url,
            seller: { "@type": "Organization", name: BRAND_NAME },
            shippingDetails: shippingDetails(),
            hasMerchantReturnPolicy: returnPolicy(),
          },
        }
      : {}),
  };
}

/** Home > Prints > this print. The grid at /prints already has one; the print itself did not. */
export function shopPrintBreadcrumb(art: Pick<FreeArt, "id" | "title">): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Prints", item: `${SITE_URL}/prints` },
      { "@type": "ListItem", position: 3, name: art.title, item: `${SITE_URL}/prints/${art.id}` },
    ],
  };
}
