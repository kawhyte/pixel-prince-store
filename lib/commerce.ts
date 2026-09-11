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
  VERSION_LABEL,
} from "@/config/commerce";
import { etsyUrl } from "@/config/links";
import { setFromPriceCents, setNoun, type WithMembers } from "@/lib/sets";

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

/**
 * The version the page opens on: the one asked for, else the artwork's default version,
 * else the first offer's. Null when the print has a single version.
 */
export function resolveVersion(art: WithOffers & { defaultVersion?: string }, requested?: string | null): string | null {
  const list = getVersions(art);
  if (list.length === 0) return null;
  for (const candidate of [requested, art.defaultVersion]) {
    const hit = list.find((x) => x.version === candidate);
    if (hit) return hit.version;
  }
  return list[0].version;
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
  art: WithOffers & { defaultFinish?: FinishId; defaultVersion?: string },
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

/**
 * The image that represents an offer. Whatever is on the offer's "Main photo" field wins, for every
 * finish, and the flat artwork is only the fallback for an offer that has no photo yet.
 *
 * Unframed used to prefer the flat art. That made the finish tiles an unfair comparison, a bare
 * poster against a framed room shot, and it stopped a real unframed room photo from ever showing.
 * The one rule this keeps: the picture always matches the finish that is selected. Showing a framed
 * room shot while the buyer has unframed selected would be selling them something else.
 */
export function offerImage(offer: PrintOffer | null | undefined): string | undefined {
  if (!offer) return undefined;
  return offer.mockupUrl || offer.artUrl;
}

/**
 * Width / height of whatever `offerImage` picked. The frame is cut to this so a photo is never
 * padded with grey bars down its sides, and never cropped either. Undefined when the asset has no
 * dimensions recorded, and the caller keeps its own default.
 */
export function offerImageRatio(offer: PrintOffer | null | undefined): number | undefined {
  if (!offer) return undefined;
  // Follow the same choice offerImage made, or a missing ratio on the chosen photo would hand back
  // the other photo's shape and the frame would be cut to the wrong picture.
  const ratio = offer.mockupUrl ? offer.mockupRatio : offer.artRatio;
  return ratio && ratio > 0 ? ratio : undefined;
}

/**
 * Alt text typed in Studio for whichever photo `offerImage` picked. Undefined when nobody has
 * written one, and the caller keeps its own generated line rather than shipping an empty alt.
 */
export function offerImageAlt(offer: PrintOffer | null | undefined): string | undefined {
  if (!offer) return undefined;
  const alt = offer.mockupUrl ? offer.mockupAlt : offer.artAlt;
  const trimmed = alt?.trim();
  return trimmed ? trimmed : undefined;
}

export interface GalleryImage {
  url: string;
  alt?: string;
}

/**
 * Extra photos for the version on screen, in gallery order.
 *
 * Photos hang off an offer, which is a version AND a finish, but a colorway looks the same whether
 * it is behind glass or not, so shooting four sets would be busywork. An offer with no photos of
 * its own borrows from another offer of the same version. One set per colorway is enough, and
 * overriding a single finish still works by filling that offer in.
 */
/**
 * The extra photos for the offer on screen, and only that offer.
 *
 * This used to fall back to a sibling offer of the same version in any finish, so that photos
 * uploaded once showed on both. That was fine while they were crops of the artwork and wrong the
 * moment one was a room shot: a framed print on a wall appeared under Unframed, promising a frame
 * that is not in the box. A gallery lives on an offer, an offer is a version and a finish, and it
 * does not travel. Photos meant for every finish belong in the artwork's room photos.
 */
export function versionGallery(
  art: WithOffers,
  version?: string | null,
  finish?: FinishId | null,
): GalleryImage[] {
  const own = getActiveOffer(art, finish ?? undefined, version)?.gallery;
  return (own ?? []).filter((i) => i?.url);
}

/** Version tiles compare artwork, so they show the flat art whatever finish is on screen. */
export function versionImage(offer: PrintOffer | null | undefined): string | undefined {
  if (!offer) return undefined;
  return offer.artUrl || offer.mockupUrl;
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
  /** one per version, for the card's swatch row. Empty for a free print or a single-version one. */
  versions: { label: string; imageUrl?: string }[];
  versionNoun: string;
}

/**
 * Where an ArtCard links, what its price row says, and which versions it comes in.
 *
 * The version swatches live here rather than at each grid because there are four grids showing shop
 * prints, and the next one added would have quietly shipped without them.
 */
export function cardCommerce(art: Pick<FreeArt, "id" | "listing" | "offers"> & WithMembers): CardCommerce {
  if (!isShopPrint(art)) {
    return { href: `/art/${art.id}`, meta: "Digital print", value: "FREE", versions: [], versionNoun: VERSION_LABEL };
  }
  // A set has no offers of its own, so its price is its members added up (PLAN-54). Without this
  // branch a set shows a blank price slot on every grid it appears in.
  if (art.kind === "set" && (art.members?.length ?? 0) > 0) {
    const from = setFromPriceCents(art);
    return {
      href: `/prints/${art.id}`,
      meta: setNoun(art),
      value: from !== null ? `From ${formatPrice(from)}` : "",
      versions: [],
      versionNoun: VERSION_LABEL,
    };
  }
  const from = fromPriceAcrossFinishes(art) ?? fromPriceCents(getActiveOffer(art));
  return {
    href: `/prints/${art.id}`,
    meta: "Art print",
    value: from !== null ? `From ${formatPrice(from)}` : "",
    versions: getVersions(art).map((v) => ({ label: v.version, imageUrl: versionImage(v.offer) })),
    versionNoun: VERSION_LABEL,
  };
}

/** How long a print wears the "New" ribbon. */
export const NEW_PRINT_DAYS = 30;

/**
 * True when the artwork was created within the last `days` days (New ribbon on the grid).
 *
 * Pass `now` from the server in a client component. The default reads the caller's clock, and a
 * cached page renders on the server at one moment and hydrates in the browser at another, so a
 * print on the boundary would get the ribbon in the HTML and lose it a moment later.
 */
export function isNewPrint(createdAt: string | undefined, days = NEW_PRINT_DAYS, now: number = Date.now()): boolean {
  if (!createdAt) return false;
  const t = new Date(createdAt).getTime();
  if (!Number.isFinite(t)) return false;
  return now - t <= days * 24 * 60 * 60 * 1000;
}

/**
 * Which of these prints wear the ribbon, decided once for the whole list.
 *
 * A grid that runs on the server and again in the browser must not ask the question twice: the
 * page is cached, so the two answers come from different moments and a print on the boundary
 * gets a ribbon in the HTML that hydration then takes away. A server component calls this after
 * its fetch and hands the result down, which leaves the grid deciding nothing from a clock.
 */
export function newPrintIds(
  prints: readonly Pick<FreeArt, "id" | "createdAt">[],
  now: number = Date.now(),
): string[] {
  return prints.filter((p) => isNewPrint(p.createdAt, NEW_PRINT_DAYS, now)).map((p) => p.id);
}

