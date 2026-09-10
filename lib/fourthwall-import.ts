/**
 * Pure helpers for importing Fourthwall products into Sanity shop prints (PLAN-40).
 * No I/O here; scripts/import-fourthwall-products.ts does the fetching and writing.
 */
import { SHOP_SIZE_LADDER } from "@/config/commerce";

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
export function inferCategory(title: string): string | undefined {
  const t = title.toLowerCase();
  if (/\b(map|skyline|neighborhood|state|usa|world|city)\b/.test(t)) return "Maps";
  if (/\b(controller|console|gamer|game|bit|arcade|handheld|patent)\b/.test(t)) return "Video Games";
  if (/\b(quote|motivat)/.test(t)) return "Quotes";
  if (/\b(funny|meme)\b/.test(t)) return "Funny";
  if (/\b(botanical|plant|floral|flower)\b/.test(t)) return "Botanical";
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

/** Artwork title and version from a Fourthwall product name, finish suffix removed. */
export function splitProductName(name: string): { title: string; version: string | null; finish: ImportFinish } {
  const { baseTitle, finish } = splitFinish(name);
  return { ...splitVersion(baseTitle), finish };
}

/**
 * Deterministic Sanity id for an artwork: the unframed product, first by name so several versions
 * always pick the same one, else the first product given.
 */
export function sanityIdForArtwork(products: FwProduct[]): string {
  const unframed = [...products]
    .filter((p) => splitFinish(p.name).finish === "unframed")
    .sort((a, b) => a.name.localeCompare(b.name));
  return sanityIdForFourthwallProduct((unframed[0] ?? products[0]).id);
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
