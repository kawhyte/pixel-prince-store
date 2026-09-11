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
import { DEFAULT_FINISH, SHOP_SIZE_LADDER, type FinishId } from "@/config/commerce";
import type { FreeArt, PrintOffer, SetMember } from "@/sanity/lib/client";

// Deliberately no import from lib/commerce. Sets are built on config and the raw offers, so the
// dependency runs one way and `cardCommerce` over there can price a set without a cycle. The two
// helpers below are the whole of what was borrowed.
const finishOf = (offer: PrintOffer): FinishId => offer.finish ?? DEFAULT_FINISH;
const versionOf = (offer: PrintOffer): string | null => offer.version?.trim() || null;

/**
 * The smallest shape these need, so tests do not have to build a whole artwork and a card can
 * pass what it has. `kind` is optional because older documents predate it and a missing kind is
 * simply not a set.
 */
export type WithMembers = { kind?: FreeArt["kind"]; members?: SetMember[] };

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
    // With nothing pinned, take the member's first version, which is what its own page opens on.
    const firstVersion = offers.map(versionOf).find((v): v is string => !!v) ?? null;
    out.push({
      id: print.slug?.current ?? print._id,
      title: print.title,
      slug: print.slug?.current ?? "",
      version: m.version?.trim() || firstVersion,
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
      (o) => finishOf(o) === finish && (member.version === null || versionOf(o) === member.version),
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
  const perMember = members.map((m) => new Set((offerFor(m, finish)?.sizes ?? []).map((s) => s.sizeId)));
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

/**
 * The size rows for a finish, shaped like an offer's own rows so the checkout UI can render a set
 * and a single print through the same code path. No `providerVariantId`: a set has several, and
 * `setVariantIds` is the honest way to ask for them.
 */
export function setSizeRows(art: WithMembers, finish: FinishId): { sizeId: string; priceCents: number }[] {
  const rows: { sizeId: string; priceCents: number }[] = [];
  for (const sizeId of setSizes(art, finish)) {
    const priceCents = setPriceCents(art, finish, sizeId);
    if (priceCents !== null) rows.push({ sizeId, priceCents });
  }
  return rows;
}

/**
 * The finish a set opens on: the first one every member can be made in, cheapest-looking first
 * because `setFinishes` keeps the candidate order and unframed leads it.
 */
export function resolveSetFinish(art: WithMembers, requested?: FinishId | null): FinishId | null {
  const available = setFinishes(art);
  if (available.length === 0) return null;
  return requested && available.includes(requested) ? requested : available[0];
}

/** "Set of 2", built from what is actually sellable rather than from the title. */
export function setNoun(art: WithMembers): string {
  return `Set of ${setMembers(art).length}`;
}
