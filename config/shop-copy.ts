/**
 * Shop product page copy (PLAN-36). Display strings only.
 * [KENNY: confirm] paper spec, production and transit days, and the damage
 * guarantee wording against Printful before launch. PLAN-39 turns the shipping
 * and returns answers into standalone pages.
 */
import { DAMAGE_CLAIM_DAYS, DELIVERY_WINDOW } from "@/config/support";

export const SHOP_FEATURES = [
  { title: "Premium-quality matte paper", body: "189 gsm museum-grade matte, glare-free, archival inks." },
  // Free shipping and the arrival date are promoted to the two check lines under the rating, where
  // a first-time buyer sees them without scrolling. They are deliberately not repeated here.
  { title: "Damage guarantee", body: "Arrives bent or damaged? Send a photo, we reprint it free." },
] as const;

export const SHOP_SHIPPING_FAQ = [
  {
    q: "How long does delivery take?",
    a: `Orders arrive within ${DELIVERY_WINDOW} of being placed, printing included, anywhere in the US. You get tracking by email.`,
  },
  { q: "How much is shipping?", a: "Nothing. Shipping is free on every order to a US address, whatever the size and however many prints you buy." },
  { q: "Do you ship outside the US?", a: "Not yet. US addresses only for now." },
  {
    q: "How is it packaged?",
    a: "Flat in a rigid mailer or rolled in a sturdy tube, depending on the size. Both are packed to survive the trip.",
  },
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

export const SHOP_TRUST_LINE = `Secure checkout · Free US shipping · Arrives in ${DELIVERY_WINDOW}`;

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
export interface ShopImage {
  url: string;
  alt: string;
}

/** Also the photo in the "Pick the right size" section, which imports it by name. */
export const SIZE_GUIDE_IMAGE: ShopImage = {
  url: "/shop/size-guide.webp",
  alt: "Size guide: seven print sizes from 8 by 10 to 24 by 36 inches, shown to scale on a wall above a 90 inch sofa",
};

export const FRAMED_FEATURES_IMAGE: ShopImage = {
  url: "/shop/framed-features.webp",
  alt: "Framed poster features: hanging hardware already attached, a frame three quarters of an inch thick, and an alder semi-hardwood moulding",
};

/**
 * Slides appended to every shop print's gallery, so a new listing gets them without anyone
 * remembering to. Returned in gallery order: the framed spec card sits second to last and the size
 * guide closes.
 *
 * The frame card is only shown to someone actually looking at the framed product. On an unframed
 * poster it is at best noise and at worst reads as a promise that a frame is in the box, which is
 * the one thing the page must never imply.
 */
export function shopGalleryExtras(finish?: string | null): ShopImage[] {
  return finish === "framed" ? [FRAMED_FEATURES_IMAGE, SIZE_GUIDE_IMAGE] : [SIZE_GUIDE_IMAGE];
}

/** Four-up trust strip under the buy area on shop pages. Icons are picked in the component by index. */
export const SHOP_TRUST_STRIP = [
  { label: "Free US shipping", sub: "on every order" },
  { label: `Arrives in ${DELIVERY_WINDOW}`, sub: "printed to order" },
  { label: "Damage guarantee", sub: "reprinted free" },
  { label: "Secure checkout", sub: "card, Apple Pay, PayPal" },
] as const;

