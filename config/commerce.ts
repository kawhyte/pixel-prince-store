/**
 * Commerce configuration (PLAN-34 decisions, PLAN-35 schema).
 * Display values only. The provider (Fourthwall today, Stripe in Phase 2)
 * is the source of truth for the amount actually charged.
 */

export const COMMERCE_PROVIDERS = ["fourthwall", "etsy", "stripe"] as const;
export type CommerceProvider = (typeof COMMERCE_PROVIDERS)[number];

/** Providers whose checkout happens on our own site (not an outbound marketplace link). */
export const ON_SITE_PROVIDERS: readonly CommerceProvider[] = ["fourthwall", "stripe"];

/** Highest priority first. `getActiveOffer()` picks the first active offer in this order. */
export const PROVIDER_PRIORITY: readonly CommerceProvider[] = ["fourthwall", "stripe", "etsy"];

export const CURRENCY = "USD";

export interface ShopSize {
  id: string; // stable key stored in Sanity
  label: string; // '8×10″'
  cm: string; // '20×25 cm'
  ratio: string; // print ratio; only 8x10 and 16x20 match the 4:5 master without cropping
}

/** The size ladder every physical offer picks from. Order = display order. */
export const SHOP_SIZE_LADDER: readonly ShopSize[] = [
  { id: "8x10", label: "8×10″", cm: "20×25 cm", ratio: "4:5" },
  { id: "11x14", label: "11×14″", cm: "28×36 cm", ratio: "11:14" },
  { id: "16x20", label: "16×20″", cm: "40×50 cm", ratio: "4:5" },
  { id: "18x24", label: "18×24″", cm: "46×61 cm", ratio: "3:4" },
  { id: "24x36", label: "24×36″", cm: "61×91 cm", ratio: "2:3" },
];

/** Initial prices in cents. Kenny confirms per artwork in Studio; these are Studio defaults only. */
export const DEFAULT_PRICE_CENTS: Record<string, number> = {
  "8x10": 2399,
  "11x14": 2999,
  "16x20": 3699,
  "18x24": 3999,
  "24x36": 4999,
};

export function getShopSize(id: string): ShopSize | undefined {
  return SHOP_SIZE_LADDER.find((s) => s.id === id);
}

/**
 * Fourthwall checkout host. Custom domain (checkout.thepixelprince.com) once DNS is set,
 * otherwise the shop's own fourthwall.com domain. No protocol, no trailing slash.
 * Unset until Kenny's account exists: the Buy button then renders "Coming soon".
 */
export const FOURTHWALL_CHECKOUT_DOMAIN = process.env.NEXT_PUBLIC_FOURTHWALL_CHECKOUT_DOMAIN ?? "";

/** Attribution on every checkout hand-off, mirrors etsyUrl(). */
export const CHECKOUT_UTM = { utm_source: "pixelprince", utm_medium: "site" } as const;

