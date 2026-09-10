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

/** Size marked Popular (and preselected) when a print has none flagged in Studio. Kenny's pick: 18x24. */
export const DEFAULT_POPULAR_SIZE = "18x24";

/** '18x24' -> '18″ × 24″': inches spelled out for the size picker. */
export function inchesLabel(id: string): string {
  const m = id.match(/^(\d+)x(\d+)$/);
  return m ? `${m[1]}″ × ${m[2]}″` : id;
}

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

/**
 * Public Storefront token for the on-site cart (PLAN-45). Read-only for products, read/write for
 * carts; it cannot see orders or money, which is why it may live in the browser. Empty = no cart UI.
 */
export const FOURTHWALL_STOREFRONT_TOKEN_PUBLIC = process.env.NEXT_PUBLIC_FOURTHWALL_STOREFRONT_TOKEN ?? "";
export const CART_STORAGE_KEY = "pp_cart_id";

/** Finishes (PLAN-46). One Fourthwall product per finish; the site merges them into one artwork. */
export const FINISHES = [
  { id: "unframed", label: "Unframed", blurb: "Matte poster" },
  { id: "framed", label: "Framed", blurb: "Black wood frame, ready to hang" },
  { id: "canvas", label: "Canvas", blurb: "Gallery wrap, 1.25 inch deep" },
] as const;
export type FinishId = (typeof FINISHES)[number]["id"];

/**
 * What each size sells for, in cents, per finish. **The same ladder for every print** (Kenny,
 * 2026-09-10): a print's price depends on its size and finish, never on which artwork it is.
 * So this is the whole price list for the shop, and the one place to change it.
 *
 * `npm run shop:prices` reads it, compares it against what Fourthwall is actually charging, and
 * names the products that drifted. A size left out is not checked, which is how canvas skips 8x10.
 */
export const TARGET_PRICES: Record<FinishId, Partial<Record<string, number>>> = {
  unframed: { "8x10": 2399, "11x14": 2700, "16x20": 3400, "18x24": 3700, "24x36": 4500 },
  framed: { "8x10": 5800, "11x14": 6500, "16x20": 9500, "18x24": 10500, "24x36": 18500 },
  canvas: { "11x14": 5500, "16x20": 11000, "18x24": 13000, "24x36": 19500 },
};

/** What the version picker is called on the page (PLAN-48). "Style" and "Colour" also read well. */
export const VERSION_LABEL = "Version";
export const DEFAULT_FINISH: FinishId = "unframed";
export function getFinish(id: string | undefined) {
  return FINISHES.find((f) => f.id === id);
}

