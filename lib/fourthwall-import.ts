/**
 * Pure helpers for importing Fourthwall products into Sanity shop prints (PLAN-40).
 * No I/O here; scripts/import-fourthwall-products.ts does the fetching and writing.
 */
import {
  DEFAULT_RATIO,
  FULL_LADDER,
  SHOP_SIZE_LADDER,
  scopeFromTag,
  sizeIdsForScope,
  type LadderScope,
  type RatioId,
} from "@/config/commerce";

export interface FwImage {
  id?: string;
  url: string;
  width?: number;
  height?: number;
}

export interface FwVariant {
  id: string;
  unitPrice?: { value?: number; currency?: string };
  attributes?: { size?: { name?: string }; color?: { name?: string; swatch?: string } };
  name?: string;
  images?: FwImage[];
}

export interface FwProduct {
  id: string;
  name: string;
  slug?: string;
  description?: string;
  images?: FwImage[];
  variants?: FwVariant[];
  state?: { type?: string };
  access?: { type?: string };
}

/** '8" x 10"' | '8x10' | '18 × 24' -> '8x10' / '18x24'. Null when not a WxH label. */
export function sizeIdFromLabel(label: string | undefined): string | null {
  const m = (label ?? "").match(/(\d+)\s*(?:"|″)?\s*[x×]\s*(\d+)/i);
  return m ? `${m[1]}x${m[2]}` : null;
}

export function variantSizeLabel(v: FwVariant): string {
  return v.attributes?.size?.name ?? v.name ?? "";
}

export interface MappedSize {
  _type: "shopSize";
  _key: string;
  sizeId: string;
  priceCents: number;
  providerVariantId: string;
}

/**
 * One variant per size. A framed product repeats every size once per frame colour, so the
 * preferred colour wins; a poster also carries a colour (the paper), so a variant is never
 * dropped just for not being black. Keyed by size id, in ladder-agnostic first-seen order.
 */
export function pickVariantPerSize<T extends FwVariant>(variants: T[], preferredColor: string = "Black"): Map<string, T> {
  const bySize = new Map<string, T>();
  for (const variant of variants) {
    const sizeId = sizeIdFromLabel(variantSizeLabel(variant));
    if (!sizeId) continue;
    const existing = bySize.get(sizeId);
    if (!existing || variant.attributes?.color?.name === preferredColor) bySize.set(sizeId, variant);
  }
  return bySize;
}

/** Preferred frame color when a framed product carries several (one variant per color and size). */
export const PREFERRED_COLOR = "Black";

/**
 * Variants that match the ladder, in ladder order. `skipped` lists the labels that did not.
 * When one size exists in several colors, the preferred color wins and the rest are ignored
 * (a shop offer holds one variant per size).
 */
export function mapVariantsToSizes(variants: FwVariant[], preferredColor: string = PREFERRED_COLOR): { sizes: MappedSize[]; skipped: string[] } {
  const ladderIds = SHOP_SIZE_LADDER.map((s) => s.id);
  const sizes: MappedSize[] = [];
  const skipped: string[] = [];
  for (const v of variants) {
    const id = sizeIdFromLabel(variantSizeLabel(v));
    const cents = typeof v.unitPrice?.value === "number" ? Math.round(v.unitPrice.value * 100) : null;
    if (!id || !ladderIds.includes(id) || cents === null) {
      skipped.push(variantSizeLabel(v) || v.id);
      continue;
    }
    const existing = sizes.findIndex((s) => s.sizeId === id);
    const row: MappedSize = { _type: "shopSize", _key: `fw-${id}`, sizeId: id, priceCents: cents, providerVariantId: v.id };
    if (existing >= 0) {
      const color = v.attributes?.color?.name;
      if (color === preferredColor) sizes[existing] = row; // preferred color replaces an earlier one
      continue;
    }
    sizes.push(row);
  }
  sizes.sort((a, b) => ladderIds.indexOf(a.sizeId) - ladderIds.indexOf(b.sizeId));
  return { sizes, skipped };
}

export function stripHtml(html: string | undefined): string {
  return (html ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

/** Keyword guess; Kenny confirms in Studio. Values are the Sanity `category` list values. */
/**
 * The category a title implies, or undefined when nothing fits.
 *
 * Every pattern allows a trailing "s". They did not, and `\bcontroller\b` does not match
 * "Controllers": the boundary needs a non-word character after it and the plural supplies a
 * letter. So "Retro Controllers" and "Retro Consoles" both imported with no category, which
 * keeps a print out of every collection page while looking fine on its own.
 */
export function inferCategory(title: string): string | undefined {
  const t = title.toLowerCase();
  if (/\b(map|skyline|neighborhood|state|usa|world|city|cities)s?\b/.test(t)) return "Maps";
  // gaming and gamer before game: the alternation takes the first match, and \bgame\b cannot
  // match "Gaming" any more than \bcontroller\b could match "Controllers".
  if (/\b(controller|console|gaming|gamer|game|bit|arcade|handheld|patent)s?\b/.test(t)) return "Video Games";
  if (/\b(quote|motivat)/.test(t)) return "Quotes";
  if (/\b(funny|meme)s?\b/.test(t)) return "Funny";
  if (/\b(botanical|plant|floral|flower)s?\b/.test(t)) return "Botanical";
  if (/\bminimal/.test(t)) return "Minimalist";
  return undefined;
}

export function inferKind(title: string): "single" | "set" {
  return /\bset of\b/i.test(title) ? "set" : "single";
}

/**
 * Extra mockups for the gallery: Fourthwall renders the same scenes for every size, so take the
 * first variant's images (one set of scenes), skip the first (already the preview), keep `max`.
 */
export function pickGalleryImages(p: FwProduct, max = 3): FwImage[] {
  const source = p.variants?.[0]?.images?.length ? p.variants[0].images : (p.images ?? []);
  const seen = new Set<string>();
  const out: FwImage[] = [];
  for (const img of source.slice(1)) {
    const key = img.id ?? img.url;
    if (!img.url || seen.has(key)) continue;
    seen.add(key);
    out.push(img);
    if (out.length >= max) break;
  }
  return out;
}

/**
 * One Fourthwall product's contribution to an offer: what it carries (a single ratio family, or
 * FULL_LADDER for a white-ground master that sells the whole range) and which ladder sizes its
 * variants provide.
 */
export interface RatioSource<T> {
  ratio: LadderScope;
  product: T;
  sizes: MappedSize[];
}

export interface MergedSizes<T> {
  sizes: MappedSize[];
  /** the product each size was taken from, for the log */
  from: Map<string, T>;
  /** sizes served by a product whose shape does not match the paper, so they letterbox */
  letterboxed: string[];
}

/**
 * Merge several products into the one set of sizes an offer sells.
 *
 * Three claims on a size, strongest first:
 *
 *  1. the product whose ratio family owns it, so 24x36 comes from the [2x3] master and the artwork
 *     itself reaches the edge of the sheet;
 *  2. a FULL_LADDER product, which prints every size on purpose from a ground measured white when
 *     it was created. Blank paper against white art leaves nothing to see, so these are not
 *     reported as letterboxed;
 *  3. whichever product happens to offer it, reported as letterboxed rather than dropped. That is
 *     the state every pre-2026-09-17 print is in, one 4:5 master covering the whole ladder, and
 *     quietly deleting three sizes from a live print would be a far worse answer than a seam.
 *
 * A ratio owner still beats a FULL_LADDER product for its own size: white letterboxing is
 * invisible, but a master cut for the paper puts artwork where the other leaves margin.
 *
 * Ladder order, so the picker reads small to large whichever order Fourthwall returned.
 */
export function mergeSizesByRatio<T>(sources: RatioSource<T>[]): MergedSizes<T> {
  const byScope = new Map<LadderScope, RatioSource<T>>();
  for (const src of sources) if (!byScope.has(src.ratio)) byScope.set(src.ratio, src);
  const full = byScope.get(FULL_LADDER);

  const sizes: MappedSize[] = [];
  const from = new Map<string, T>();
  const letterboxed: string[] = [];

  for (const ladderSize of SHOP_SIZE_LADDER) {
    const owner = byScope.get(ladderSize.ratio as RatioId);
    const ownerRow = owner?.sizes.find((s) => s.sizeId === ladderSize.id);
    if (ownerRow && owner) {
      sizes.push(ownerRow);
      from.set(ladderSize.id, owner.product);
      continue;
    }
    const fullRow = full?.sizes.find((s) => s.sizeId === ladderSize.id);
    if (fullRow && full) {
      sizes.push(fullRow);
      from.set(ladderSize.id, full.product);
      continue;
    }
    const fallback = sources.find((s) => s.sizes.some((r) => r.sizeId === ladderSize.id));
    const row = fallback?.sizes.find((r) => r.sizeId === ladderSize.id);
    if (!row || !fallback) continue;
    sizes.push(row);
    from.set(ladderSize.id, fallback.product);
    letterboxed.push(ladderSize.id);
  }

  return { sizes, from, letterboxed };
}

export type ImportFinish = "unframed" | "framed" | "canvas";

/**
 * Naming convention: "Sweden Map | Framed", "Sweden Map | Canvas", "Sweden Map" or "Sweden Map | Unframed".
 * Suffix wins; without one, "framed" or "canvas" anywhere in the name decides; else unframed.
 */
export function splitFinish(name: string): { baseTitle: string; finish: ImportFinish } {
  const m = name.match(/^(.*?)\s*\|\s*(unframed|framed|canvas)\s*$/i);
  if (m) return { baseTitle: m[1].trim(), finish: m[2].toLowerCase() as ImportFinish };
  if (/\bcanvas\b/i.test(name)) return { baseTitle: name.trim(), finish: "canvas" };
  if (/\bframed\b/i.test(name)) return { baseTitle: name.trim(), finish: "framed" };
  return { baseTitle: name.trim(), finish: "unframed" };
}

/**
 * Naming convention for versions of the same artwork (PLAN-48): "Moon (Ivory)", "Moon (Midnight) | Framed".
 * A trailing parenthesis is the version; everything before it is the artwork.
 */
export function splitVersion(baseTitle: string): { title: string; version: string | null } {
  const m = baseTitle.match(/^(.*\S)\s*\(([^()]+)\)\s*$/);
  if (!m) return { title: baseTitle.trim(), version: null };
  return { title: m[1].trim(), version: m[2].trim() };
}

/**
 * The scope tag, which sits after the version and before the finish:
 * "Brooklyn Neighborhood Map (Earth) [2x3] | Framed", or [all] for a white-ground master that
 * carries every size. An untagged name is the default ratio, because every product made before
 * 2026-09-17 is named that way with a 4:5 master behind it.
 */
export function splitRatio(baseTitle: string): { baseTitle: string; ratio: LadderScope } {
  const m = baseTitle.match(/^(.*\S)\s*\[([0-9]+x[0-9]+|all)\]\s*$/i);
  if (!m) return { baseTitle: baseTitle.trim(), ratio: DEFAULT_RATIO };
  const scope = scopeFromTag(m[2]);
  // An unrecognised tag is left in the title on purpose: silently dropping it would merge a
  // product into an artwork it does not belong to, and a visibly odd title is easier to notice.
  return scope ? { baseTitle: m[1].trim(), ratio: scope } : { baseTitle: baseTitle.trim(), ratio: DEFAULT_RATIO };
}

/**
 * Artwork title, version, ratio and finish from a Fourthwall product name.
 *
 * Strip order is finish, then ratio, then version: the tag sits between the version and the finish,
 * and splitVersion matches a trailing parenthesis that the tag would otherwise hide.
 */
export function splitProductName(name: string): {
  title: string;
  version: string | null;
  ratio: LadderScope;
  finish: ImportFinish;
} {
  const { baseTitle, finish } = splitFinish(name);
  const { baseTitle: untagged, ratio } = splitRatio(baseTitle);
  return { ...splitVersion(untagged), ratio, finish };
}

/**
 * Products for one artwork that carry a ratio rather than the whole ladder, and the sizes those
 * products would keep.
 *
 * A ratio owns its own sizes, so an [all] master does not take them back by existing. Creating one
 * beside a bare-named legacy product leaves the print selling 8x10 and 16x20 off the old 4:5 master
 * and the rest off the new one: two different pieces of artwork under one listing, which nobody
 * sees until a customer holds both. Named here so `shop:new` can say it before it happens.
 *
 * Titles are compared after the finish and the scope tag come off, so every finish of a version
 * counts once for what it is.
 */
export function scopeRivals(names: readonly string[], title: string): { names: string[]; sizeIds: string[] } {
  const rivals: string[] = [];
  const sizeIds = new Set<string>();
  for (const name of names) {
    const { baseTitle } = splitFinish(name);
    const { baseTitle: untagged, ratio } = splitRatio(baseTitle);
    if (untagged !== title || ratio === FULL_LADDER) continue;
    rivals.push(name);
    for (const id of sizeIdsForScope(ratio)) sizeIds.add(id);
  }
  return {
    names: rivals,
    sizeIds: SHOP_SIZE_LADDER.map((s) => s.id).filter((id) => sizeIds.has(id)),
  };
}

/**
 * Deterministic Sanity id for an artwork: the unframed product, first by name so several versions
 * always pick the same one, else the first product given.
 */
export function sanityIdForArtwork(products: FwProduct[]): string {
  // The default-ratio unframed product, so adding a [2x3] sibling to an artwork that already
  // exists does not move its Sanity id and orphan everything Kenny wrote in Studio.
  const rank = (p: FwProduct) => {
    const { ratio, finish } = splitProductName(p.name);
    return (finish === "unframed" ? 0 : 1) + (ratio === DEFAULT_RATIO ? 0 : 2);
  };
  const ordered = [...products].sort((a, b) => rank(a) - rank(b) || a.name.localeCompare(b.name));
  return sanityIdForFourthwallProduct((ordered[0] ?? products[0]).id);
}

/** Deterministic Sanity id for a Fourthwall product, so re-runs update instead of duplicating. */
export function sanityIdForFourthwallProduct(productId: string): string {
  return `fw-${productId}`;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/["'″]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Public, available, and not a test product (unless the caller opts test products in). */
export function isImportable(p: FwProduct, includeTest = false): boolean {
  if (p.state?.type !== "AVAILABLE" || p.access?.type !== "PUBLIC") return false;
  if (!includeTest && /\btest\b/i.test(p.name)) return false;
  return true;
}

/**
 * Whether a sync may write room photos onto an artwork that already exists in Sanity.
 *
 * Only on an explicit --reset-images. It used to seed whenever the gallery was empty, which
 * cannot tell "never seeded" from "emptied on purpose": Kenny deleted Brooklyn's Fourthwall
 * renders, and the next sync put three back. A new artwork is seeded where it is created, so
 * nothing here is needed to keep a fresh listing from being blank.
 *
 * The rule this encodes (PLAN-52): Fourthwall owns money and fulfilment, Studio owns what a
 * customer looks at. An empty gallery is a decision, and a sync does not get a vote. The same
 * now holds for an offer's main photo, which the import used to refill whenever it was blank.
 */
export function shouldReplaceGallery(opts: { resetImages: boolean; incomingPhotos: number }): boolean {
  return opts.resetImages && opts.incomingPhotos > 0;
}
