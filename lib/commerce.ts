import type { FreeArt, PrintOffer, ShopSizeOffer } from "@/sanity/lib/client";
import { CURRENCY, ON_SITE_PROVIDERS, PROVIDER_PRIORITY, SHOP_SIZE_LADDER } from "@/config/commerce";

type WithOffers = Pick<FreeArt, "offers">;

/** Shop prints are sold and never downloadable; anything else is a free print. */
export function isShopPrint(art: Pick<FreeArt, "listing">): boolean {
  return art.listing === "shop";
}

function activeOffers(art: WithOffers): PrintOffer[] {
  return (art.offers ?? []).filter((o) => o.active !== false);
}

/** First active offer by PROVIDER_PRIORITY (fourthwall, stripe, etsy). */
export function getActiveOffer(art: WithOffers): PrintOffer | null {
  const list = activeOffers(art);
  for (const provider of PROVIDER_PRIORITY) {
    const found = list.find((o) => o.provider === provider);
    if (found) return found;
  }
  return null;
}

/** Active offer whose checkout happens on our site, or null. */
export function getOnSiteOffer(art: WithOffers): PrintOffer | null {
  const offer = getActiveOffer(art);
  return offer && ON_SITE_PROVIDERS.includes(offer.provider) ? offer : null;
}

/** Sizes ordered by the ladder, dropping ids the ladder does not know. */
export function orderedSizes(offer: PrintOffer): ShopSizeOffer[] {
  const rows = offer.sizes ?? [];
  return SHOP_SIZE_LADDER.flatMap((s) => rows.filter((r) => r.sizeId === s.id));
}

export function fromPriceCents(offer: PrintOffer | null): number | null {
  const prices = (offer?.sizes ?? []).map((s) => s.priceCents).filter((p) => Number.isFinite(p));
  return prices.length ? Math.min(...prices) : null;
}

export function formatPrice(cents: number, currency: string = CURRENCY): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}
