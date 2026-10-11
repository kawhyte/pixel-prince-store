/**
 * Pick the one profit margin Fourthwall lets a product have so the most important size lands
 * exactly on the shop price list (TARGET_PRICES), instead of a flat $18 / $30 that lands on none.
 *
 * Fourthwall charges the printer's cost plus the margin, and the cost differs per size, so one
 * margin can be right for one size at a time. That is why per-ratio products help: a [3x4] product
 * sells only 18x24, so its price comes out exactly right with nothing to fix by hand. For a product
 * with several sizes the Popular size wins, else the largest (the most money on the line).
 *
 * Costs come from a product that already exists on the same template, since every product on a
 * template pays the same printer cost per size. Pure and tested.
 */
import { DEFAULT_POPULAR_SIZE, SHOP_SIZE_LADDER, TARGET_PRICES, type FinishId } from "@/config/commerce";
import { pickVariantPerSize, splitProductName, PREFERRED_COLOR, type FwVariant } from "@/lib/fourthwall-import";

type CostVariant = FwVariant & { unitCost?: { value?: number } };

/** Printer cost in cents per size, per finish, read off the shop's existing products. */
export function costsByFinish(products: { name: string; variants?: CostVariant[] }[]): Partial<Record<FinishId, Map<string, number>>> {
  const out: Partial<Record<FinishId, Map<string, number>>> = {};
  for (const p of products) {
    const { finish } = splitProductName(p.name);
    const costs = (out[finish] ??= new Map());
    for (const [sizeId, v] of pickVariantPerSize(p.variants ?? [], PREFERRED_COLOR)) {
      const c = v.unitCost?.value;
      if (typeof c === "number" && !costs.has(sizeId)) costs.set(sizeId, Math.round(c * 100));
    }
  }
  return out;
}

/**
 * The margin, in cents, that makes one of `sizeIds` exactly right, and which size that is.
 * Null when a cost or a target is missing; the caller then falls back to its flat default.
 */
export function pickMarginCents(
  finish: FinishId,
  sizeIds: string[],
  costs: Map<string, number> | undefined,
  prefer: string = DEFAULT_POPULAR_SIZE,
): { marginCents: number; exactSize: string } | null {
  if (!costs || sizeIds.length === 0) return null;
  const ladder = SHOP_SIZE_LADDER.map((s) => s.id);
  const ordered = [...sizeIds].sort((a, b) => ladder.indexOf(a) - ladder.indexOf(b));
  const exactSize = ordered.includes(prefer) ? prefer : ordered[ordered.length - 1];
  const target = TARGET_PRICES[finish]?.[exactSize];
  const cost = costs.get(exactSize);
  if (typeof target !== "number" || typeof cost !== "number") return null;
  const marginCents = target - cost;
  return marginCents > 0 ? { marginCents, exactSize } : null;
}
