/**
 * Sets of prints (PLAN-54): two to four prints sold together, each still sold on its own.
 *
 * A set has no Fourthwall product. It is a Sanity artwork that references its members, and
 * everything it shows is read back off them: the price, the sizes, the finishes, the variant ids
 * the cart needs. Nothing is copied, so `shop:sync` refreshing a member's prices updates the set
 * too, and a set can never quote a price its members do not charge.
 *
 * The rule running through all of it is intersection, not union. A set offers a finish or a size
 * only when *every* member has it, because a set that cannot be made in full is not a set.
 */
import { SHOP_SIZE_LADDER, type FinishId } from "@/config/commerce";
import { offerFinish, offerVersion, orderedSizes, resolveVersion } from "@/lib/commerce";
import type { FreeArt, PrintOffer, SetMember } from "@/sanity/lib/client";

/** The smallest shape these need, so tests do not have to build a whole artwork. */
export type WithMembers = Pick<FreeArt, "kind"> & { members?: SetMember[] };

export interface ResolvedMember {
  id: string;
  title: string;
  slug: string;
  version: string | null;
  previewImage?: NonNullable<SetMember["print"]>["previewImage"];
  /** every active offer on the member, for picking a finish later */
  offers: PrintOffer[];
}

export function isSet(art: WithMembers): boolean {
  return art.kind === "set" && (art.members?.length ?? 0) > 0;
}

/**
 * The members that can actually be sold, in the order Studio lists them.
 *
 * A member is dropped when its reference is missing, when it has no offers, or when it is itself
 * a set. Unpublishing a print is one click and its effect lands here, two pages away, so this
 * fails quietly to a shorter list and `sellableSet` below decides what that means.
 */
export function setMembers(art: WithMembers): ResolvedMember[] {
  const out: ResolvedMember[] = [];
  for (const m of art.members ?? []) {
    const print = m.print;
    if (!print?._id || !print.title) continue;
    const offers = (print.offers ?? []).filter((o) => o.active !== false);
    if (offers.length === 0) continue;
    const asArt = { offers, defaultVersion: undefined } as unknown as Parameters<typeof resolveVersion>[0];
    out.push({
      id: print.slug?.current ?? print._id,
      title: print.title,
      slug: print.slug?.current ?? "",
      version: m.version?.trim() || resolveVersion(asArt),
      previewImage: print.previewImage,
      offers,
    });
  }
  return out;
}

/** A set needs at least two members left to be worth selling. One print is just that print. */
export function sellableSet(art: WithMembers): boolean {
  return isSet(art) && setMembers(art).length >= 2;
}

/**
 * The member's offer in exactly this finish, or null.
 *
 * Deliberately not `getActiveOffer`, which resolves rather than matches: asked for a finish a
 * print does not sell, it hands back whatever that print does sell. That is right on a product
 * page, where the buyer picked the print first, and wrong here, where the question is "can every
 * member be made in this finish" and a helpful substitute is a false yes.
 */
function offerFor(member: ResolvedMember, finish: FinishId): PrintOffer | null {
  return (
    member.offers.find(
      (o) => offerFinish(o) === finish && (member.version === null || offerVersion(o) === member.version),
    ) ?? null
  );
}

/** The finishes every member sells. Offering one that a single member lacks sells the unmakeable. */
export function setFinishes(art: WithMembers, candidates: readonly FinishId[] = ["unframed", "framed", "canvas"]): FinishId[] {
  const members = setMembers(art);
  if (members.length < 2) return [];
  return candidates.filter((f) => members.every((m) => (offerFor(m, f)?.sizes?.length ?? 0) > 0));
}

/** The sizes every member sells in this finish, in ladder order. */
export function setSizes(art: WithMembers, finish: FinishId): string[] {
  const members = setMembers(art);
  if (members.length < 2) return [];
  const perMember = members.map((m) => {
    const offer = offerFor(m, finish);
    return new Set((offer ? orderedSizes(offer) : []).map((s) => s.sizeId));
  });
  return SHOP_SIZE_LADDER.map((s) => s.id).filter((id) => perMember.every((set) => set.has(id)));
}

/** What the set costs at this size: the members added up, or null when any one of them lacks it. */
export function setPriceCents(art: WithMembers, finish: FinishId, sizeId: string): number | null {
  const members = setMembers(art);
  if (members.length < 2) return null;
  let total = 0;
  for (const m of members) {
    const row = (offerFor(m, finish)?.sizes ?? []).find((s) => s.sizeId === sizeId);
    if (!row || typeof row.priceCents !== "number") return null;
    total += row.priceCents;
  }
  return total;
}

/** The cheapest the set can be bought for, for the card. */
export function setFromPriceCents(art: WithMembers): number | null {
  const prices: number[] = [];
  for (const finish of setFinishes(art)) {
    for (const sizeId of setSizes(art, finish)) {
      const p = setPriceCents(art, finish, sizeId);
      if (p !== null) prices.push(p);
    }
  }
  return prices.length ? Math.min(...prices) : null;
}

/**
 * One Fourthwall variant per member, for the cart.
 *
 * All or nothing: a missing variant returns null rather than a short list, because half a set in
 * the bag is worse than no button. The order matches `setMembers`, so the drawer reads the way
 * the page does.
 */
export function setVariantIds(art: WithMembers, finish: FinishId, sizeId: string): string[] | null {
  const members = setMembers(art);
  if (members.length < 2) return null;
  const ids: string[] = [];
  for (const m of members) {
    const row = (offerFor(m, finish)?.sizes ?? []).find((s) => s.sizeId === sizeId);
    if (!row?.providerVariantId) return null;
    ids.push(row.providerVariantId);
  }
  return ids;
}

/** "Set of 2", built from what is actually sellable rather than from the title. */
export function setNoun(art: WithMembers): string {
  return `Set of ${setMembers(art).length}`;
}
