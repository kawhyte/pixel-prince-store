import type { FreeArt, PrintOffer, ShopSizeOffer } from "@/sanity/lib/client";
import {
  CHECKOUT_UTM,
  CURRENCY,
  FOURTHWALL_CHECKOUT_DOMAIN,
  ON_SITE_PROVIDERS,
  PROVIDER_PRIORITY,
  SHOP_SIZE_LADDER,
} from "@/config/commerce";
import { etsyUrl } from "@/config/links";

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

export function priceRangeCents(offer: PrintOffer | null): { min: number; max: number } | null {
  const prices = (offer?.sizes ?? []).map((s) => s.priceCents).filter((p) => Number.isFinite(p));
  return prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null;
}

export function formatPrice(cents: number, currency: string = CURRENCY): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

/**
 * Direct Fourthwall checkout link (docs: /shop-apis/cart-checkout-endpoint).
 * `variantId` must be the Fourthwall variant UUID, never the product id.
 */
export function buildFourthwallCheckoutUrl(
  variantId: string,
  campaign: string,
  domain: string = FOURTHWALL_CHECKOUT_DOMAIN,
  quantity = 1,
): string | null {
  if (!domain || !variantId) return null;
  const url = new URL(`https://${domain}/cart/checkout`);
  url.searchParams.set("products", `${variantId}:${quantity}`);
  url.searchParams.set("currency", CURRENCY);
  url.searchParams.set("utm_source", CHECKOUT_UTM.utm_source);
  url.searchParams.set("utm_medium", CHECKOUT_UTM.utm_medium);
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}

export interface CheckoutTarget {
  href: string;
  /** true = leaves for a marketplace in a new tab; false = same-tab hand-off to our checkout host */
  external: boolean;
  label: string;
  provider: PrintOffer["provider"];
}

/**
 * Provider adapter. Where the Buy button goes for an offer + size, or null when it cannot
 * be bought (inactive, Stripe stub, missing ids, missing checkout domain).
 */
export function resolveCheckout(
  offer: PrintOffer | null,
  sizeId: string | null,
  campaign: string,
  domain: string = FOURTHWALL_CHECKOUT_DOMAIN,
): CheckoutTarget | null {
  if (!offer || offer.active === false) return null;
  if (offer.provider === "fourthwall") {
    const size = (offer.sizes ?? []).find((s) => s.sizeId === sizeId);
    const href = size?.providerVariantId
      ? buildFourthwallCheckoutUrl(size.providerVariantId, campaign, domain)
      : null;
    return href ? { href, external: false, label: "Buy now", provider: "fourthwall" } : null;
  }
  if (offer.provider === "etsy") {
    return offer.checkoutUrl
      ? { href: etsyUrl(offer.checkoutUrl, campaign), external: true, label: "Buy on Etsy", provider: "etsy" }
      : null;
  }
  return null; // stripe: Phase 2
}

export interface CardCommerce {
  href: string;
  meta: string;
  value: string;
}

/** Where an ArtCard links and what its price row says. Free prints keep the FREE row. */
export function cardCommerce(art: Pick<FreeArt, "id" | "listing" | "offers">): CardCommerce {
  if (!isShopPrint(art)) return { href: `/art/${art.id}`, meta: "Digital print", value: "FREE" };
  const from = fromPriceCents(getActiveOffer(art));
  return { href: `/prints/${art.id}`, meta: "Art print", value: from !== null ? `From ${formatPrice(from)}` : "" };
}

