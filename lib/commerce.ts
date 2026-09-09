import type { FreeArt, PrintOffer, ShopSizeOffer } from "@/sanity/lib/client";
import {
  CHECKOUT_UTM,
  CURRENCY,
  DEFAULT_FINISH,
  DEFAULT_POPULAR_SIZE,
  FINISHES,
  FOURTHWALL_CHECKOUT_DOMAIN,
  type FinishId,
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

export function offerFinish(offer: PrintOffer): FinishId {
  return offer.finish ?? DEFAULT_FINISH;
}

/** Every on-site offer, in document order (Studio drag order decides how versions are shown). */
function onSiteOffers(art: WithOffers): PrintOffer[] {
  return activeOffers(art).filter((o) => ON_SITE_PROVIDERS.includes(o.provider));
}

/** The artwork version an offer sells (Ivory, Midnight), or null when the print comes one way only. */
export function offerVersion(offer: PrintOffer): string | null {
  return offer.version?.trim() || null;
}

/**
 * Versions of the artwork on sale, in offer order, with the first offer of each.
 * Empty when the print has a single version, which is the common case.
 */
export function getVersions(art: WithOffers): { version: string; offer: PrintOffer }[] {
  const out: { version: string; offer: PrintOffer }[] = [];
  for (const offer of onSiteOffers(art)) {
    const version = offerVersion(offer);
    if (version && !out.some((x) => x.version === version)) out.push({ version, offer });
  }
  return out;
}

/** The version the page opens on: requested if on sale, else the first. Null when there are no versions. */
export function resolveVersion(art: WithOffers, requested?: string | null): string | null {
  const list = getVersions(art);
  if (list.length === 0) return null;
  return list.find((x) => x.version === requested)?.version ?? list[0].version;
}

/**
 * Finishes this artwork sells, in FINISHES order, with each finish's active on-site offer.
 * With a version, only that version's offers count, so a version sold unframed only shows one tile.
 */
export function getOffersByFinish(art: WithOffers, version?: string | null): { finish: FinishId; offer: PrintOffer }[] {
  const list = onSiteOffers(art).filter((o) => !version || offerVersion(o) === version);
  return FINISHES.flatMap((f) => {
    const offer = list.find((o) => offerFinish(o) === f.id);
    return offer ? [{ finish: f.id, offer }] : [];
  });
}

/** The finish the page opens on: requested, else the artwork's default, else unframed, else the first sold. */
export function resolveFinish(
  art: WithOffers & { defaultFinish?: FinishId },
  requested?: FinishId | null,
  version?: string | null,
): FinishId | null {
  const sold = getOffersByFinish(art, version).map((x) => x.finish);
  if (sold.length === 0) return null;
  for (const candidate of [requested, art.defaultFinish, DEFAULT_FINISH]) {
    if (candidate && sold.includes(candidate)) return candidate;
  }
  return sold[0];
}

/**
 * Active offer for a finish, by PROVIDER_PRIORITY (fourthwall, stripe, etsy).
 * Without a finish: the resolved default finish's on-site offer, else the first active offer of any provider.
 */
export function getActiveOffer(
  art: WithOffers & { defaultFinish?: FinishId },
  finish?: FinishId | null,
  version?: string | null,
): PrintOffer | null {
  const wantedVersion = version ?? resolveVersion(art);
  const byFinish = getOffersByFinish(art, wantedVersion);
  const wantedFinish = finish ?? resolveFinish(art, null, wantedVersion);
  const match = byFinish.find((x) => x.finish === wantedFinish);
  if (match) return match.offer;
  if (byFinish.length > 0) return byFinish[0].offer;
  const list = activeOffers(art);
  for (const provider of PROVIDER_PRIORITY) {
    const found = list.find((o) => o.provider === provider);
    if (found) return found;
  }
  return null;
}

/** Lowest price across every finish on sale, for cards and the hero. */
export function fromPriceAcrossFinishes(art: WithOffers): number | null {
  const prices = getOffersByFinish(art)
    .map((x) => fromPriceCents(x.offer))
    .filter((p): p is number => p !== null);
  return prices.length ? Math.min(...prices) : null;
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

/**
 * The size to tag Popular and preselect: the one flagged in Studio, else DEFAULT_POPULAR_SIZE
 * when the offer has it, else the first ladder size. Null when the offer has no sizes.
 */
export function popularSizeId(offer: PrintOffer | null): string | null {
  if (!offer) return null;
  const rows = orderedSizes(offer);
  if (rows.length === 0) return null;
  const flagged = rows.find((s) => s.popular);
  if (flagged) return flagged.sizeId;
  if (rows.some((s) => s.sizeId === DEFAULT_POPULAR_SIZE)) return DEFAULT_POPULAR_SIZE;
  return rows[0].sizeId;
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
  const from = fromPriceAcrossFinishes(art) ?? fromPriceCents(getActiveOffer(art));
  return { href: `/prints/${art.id}`, meta: "Art print", value: from !== null ? `From ${formatPrice(from)}` : "" };
}

/** True when the artwork was created within the last `days` days (New ribbon on the grid). */
export function isNewPrint(createdAt: string | undefined, days = 30, now: number = Date.now()): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t <= days * 24 * 60 * 60 * 1000;
}

