/**
 * "Pairs well with" on a print page: what to put next to this print. Sets that already contain it
 * come first, since that is the pairing the shop designed, then other prints in the same category,
 * then the newest of the rest. Pure, so the order is tested without Sanity.
 */
import { cardCommerce } from "@/lib/commerce";
import { isSet, sellableSet, setMembers } from "@/lib/sets";
import type { FreeArt } from "@/sanity/lib/client";

/** `shopPrints` newest first, as getShopPrints returns them. Nothing for a set's own page. */
export function pairsForPrint(art: FreeArt, shopPrints: FreeArt[], limit = 2): FreeArt[] {
  if (isSet(art)) return [];
  const buyable = shopPrints.filter((p) => p.id !== art.id && cardCommerce(p).value !== "");
  const sets = buyable.filter((p) => sellableSet(p) && setMembers(p).some((m) => m.slug === art.id));
  const singles = buyable.filter((p) => !isSet(p));
  const category = art.category?.trim();
  const sameCategory = category ? singles.filter((p) => p.category?.trim() === category) : [];
  const rest = singles.filter((p) => !sameCategory.includes(p));
  return [...sets, ...sameCategory, ...rest].slice(0, limit);
}

/** The lower "Complete the set" row: same category, minus what the buy column already shows. */
export function relatedForPrint(art: FreeArt, shopPrints: FreeArt[], shown: FreeArt[], limit = 3): FreeArt[] {
  const category = art.category?.trim();
  if (!category) return [];
  return shopPrints
    .filter((p) => p.id !== art.id && !shown.includes(p) && p.category?.trim() === category)
    .slice(0, limit);
}
