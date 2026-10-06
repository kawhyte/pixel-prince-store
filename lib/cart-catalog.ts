/**
 * What the cart needs to know about the shop: which Fourthwall variants we still sell, and which
 * prints to suggest next to the bag. Built on the server from Sanity, read in the browser.
 * Pure, so the drawer's rules are tested without a network.
 */
import { fromPriceAcrossFinishes } from "@/lib/commerce";
import type { Cart, CartItem } from "@/lib/fourthwall-cart";
import type { FreeArt } from "@/sanity/lib/client";

export interface CatalogPrint {
  slug: string;
  title: string;
  image: string;
  imageAlt?: string;
  category?: string;
  fromCents: number | null;
}

export interface CartCatalog {
  /** Fourthwall variant id -> slug of the print that sells it */
  variants: Record<string, string>;
  /** single prints, newest first: the pool "Pairs well with" picks from */
  prints: CatalogPrint[];
}

/** Every variant a shop print currently sells, plus the singles that can be bought on-site. */
export function buildCartCatalog(shopPrints: FreeArt[]): CartCatalog {
  const variants: Record<string, string> = {};
  const prints: CatalogPrint[] = [];
  for (const art of shopPrints) {
    let sellable = false;
    for (const offer of art.offers ?? []) {
      if (offer.provider !== "fourthwall" || offer.active === false) continue;
      for (const size of offer.sizes ?? []) {
        if (!size.providerVariantId) continue;
        variants[size.providerVariantId] = art.id;
        sellable = true;
      }
    }
    // Only suggest what can go straight into this bag.
    if (sellable && art.kind !== "set" && art.previewImage) {
      prints.push({
        slug: art.id,
        title: art.title,
        image: art.previewImage,
        imageAlt: art.previewImageAlt,
        category: art.category,
        fromCents: fromPriceAcrossFinishes(art),
      });
    }
  }
  return { variants, prints };
}

/** True when Fourthwall says the variant has run out. Unknown stock counts as in stock. */
function soldOut(item: CartItem): boolean {
  const stock = item.variant.stock;
  return stock?.type === "LIMITED" && typeof stock.inStock === "number" && stock.inStock <= 0;
}

/**
 * Lines that can no longer be bought: sold out at Fourthwall, or a variant we have stopped selling
 * (product removed, hidden, or replaced). Without a catalog, or with an empty one, only stock is
 * checked: a failed lookup must never flag a whole bag.
 */
export function unavailableItems(cart: Cart | null, catalog: CartCatalog | null): CartItem[] {
  if (!cart) return [];
  const known = catalog && Object.keys(catalog.variants).length > 0 ? catalog.variants : null;
  return cart.items.filter((item) => soldOut(item) || (known !== null && !(item.variant.id in known)));
}

/**
 * Up to `limit` prints to suggest beside the bag: none already in it, same category as what is in
 * it first, then the newest of the rest.
 */
export function pairsWellWith(cart: Cart | null, catalog: CartCatalog | null, limit = 2): CatalogPrint[] {
  if (!cart || !catalog || cart.items.length === 0) return [];
  const inCart = new Set(cart.items.map((i) => catalog.variants[i.variant.id]).filter(Boolean));
  const categories = new Set(
    catalog.prints.filter((p) => inCart.has(p.slug)).map((p) => p.category).filter(Boolean),
  );
  const pool = catalog.prints.filter((p) => !inCart.has(p.slug));
  const sameCategory = pool.filter((p) => p.category && categories.has(p.category));
  const rest = pool.filter((p) => !sameCategory.includes(p));
  return [...sameCategory, ...rest].slice(0, limit);
}
