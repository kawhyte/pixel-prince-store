/**
 * Shop product page copy (PLAN-36). Display strings only.
 * [KENNY: confirm] paper spec, production and transit days, and the damage
 * guarantee wording against Printful before launch. PLAN-39 turns the shipping
 * and returns answers into standalone pages.
 */
import { DAMAGE_CLAIM_DAYS } from "@/config/support";

export const SHOP_FEATURES = [
  { title: "Museum-quality matte paper", body: "189 gsm enhanced matte, glare-free, archival inks." },
  { title: "Printed to order, shipped flat or in a tube", body: "Made in the USA, arrives in 5 to 11 days." },
  { title: "Damage guarantee", body: "Arrives bent or damaged? Send a photo, we reprint it free." },
] as const;

export const SHOP_SHIPPING_FAQ = [
  {
    q: "How long does delivery take?",
    a: "Orders arrive within 5 to 11 days of being placed, printing included, anywhere in the US. You get tracking by email.",
  },
  { q: "Do you ship outside the US?", a: "Not yet. US addresses only for now." },
  {
    q: "Is a frame included?",
    a: "No. Every print ships unframed so you can pick a frame that fits your wall. The sizes match standard off-the-shelf frames.",
  },
  { q: "What if it arrives damaged?", a: `Email a photo within ${DAMAGE_CLAIM_DAYS} days and we reprint and reship it free.` },
  {
    q: "Can I return it?",
    a: "Prints are made to order, so we cannot take returns for a change of mind. Damaged or misprinted orders are always replaced.",
  },
] as const;

/** Which wall each size suits. Keys mirror config/commerce.ts SHOP_SIZE_LADDER ids. */
export const SHOP_SIZE_GUIDE: Record<string, string> = {
  "8x10": "Desk, shelf, or a small gallery wall",
  "11x14": "Hallway or above a dresser",
  "16x20": "Above a desk or a single accent wall",
  "18x24": "Above a couch or bed, reads from across the room",
  "24x36": "Statement piece for a large wall",
};

export const SHOP_TRUST_LINE = "Secure checkout · Free US shipping · Arrives in 5 to 11 days";

/**
 * Promo strip on shop pages (Direction A). Off until the matching Fourthwall promotion exists,
 * otherwise the page would promise a discount checkout does not apply. [KENNY: enable when set up]
 */
export const SHOP_PROMO = {
  enabled: false,
  headline: "Build your wall.",
  body: "Buy 2 prints, get the 3rd half off.",
  note: "Applied at checkout",
} as const;

/**
 * Shared gallery images appended after every shop print's own photos (PLAN-43 follow-up).
 * Files live in /public/shop. Add a packaging or reviews graphic here when you have one.
 */
export const SHOP_GALLERY_EXTRAS: { url: string; alt: string }[] = [
  { url: "/shop/size-guide.png", alt: "Size guide: the five print sizes shown to scale on a wall above a sofa" },
];

