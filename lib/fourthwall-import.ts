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
  attributes?: { size?: { name?: string } };
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

/** Variants that match the ladder, in ladder order. `skipped` lists the labels that did not. */
export function mapVariantsToSizes(variants: FwVariant[]): { sizes: MappedSize[]; skipped: string[] } {
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
    sizes.push({ _type: "shopSize", _key: `fw-${id}`, sizeId: id, priceCents: cents, providerVariantId: v.id });
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
