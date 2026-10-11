/**
 * `listing.json`: everything a listing says, in one file the listings session writes and
 * `npm run shop:copy` applies to the Studio draft. Validated here so a bad description is caught
 * before it reaches Sanity, not after Kenny spots it on the page. Pure and tested.
 */
import { SHOP_SIZE_LADDER, type FinishId } from "@/config/commerce";
import { ROOMS, type RoomId } from "@/config/collections";
import { checkDescription } from "@/lib/description-rules";

/** The Category options in sanity/schemaTypes/product.ts. Keep the two in step. */
export const SHOP_CATEGORIES = ["Video Games", "Quotes", "Maps", "Funny", "Minimalist", "Botanical"] as const;

export interface ListingSpec {
  /** must match the Studio artwork's title exactly; that is how the draft is found */
  title: string;
  description: string;
  longDescription?: string;
  category: (typeof SHOP_CATEGORIES)[number];
  tags: string[];
  rooms?: RoomId[];
  defaultVersion?: string;
  defaultFinish?: FinishId;
  /** the size marked Popular on every offer */
  popularSize?: string;
}

/** Google cuts titles near 60; the page adds " | <category> wall art", about 20-25 more. */
export const MAX_TITLE_CHARS = 35;

export function validateListingSpec(raw: unknown): { spec: ListingSpec | null; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  const s = (raw ?? {}) as Partial<ListingSpec>;

  if (typeof s.title !== "string" || !s.title.trim()) errors.push("title is required");
  else if (s.title.length > MAX_TITLE_CHARS) warnings.push(`title is ${s.title.length} characters; over ${MAX_TITLE_CHARS} gets cut in Google`);

  if (typeof s.description !== "string") errors.push("description is required");
  else for (const p of checkDescription(s.description).problems) errors.push(`description: ${p}`);

  if (s.longDescription !== undefined) {
    if (typeof s.longDescription !== "string") errors.push("longDescription must be text");
    else if (s.longDescription.includes(String.fromCharCode(0x2014))) errors.push("longDescription: em dash");
  }

  if (!SHOP_CATEGORIES.includes(s.category as ListingSpec["category"])) {
    errors.push(`category must be one of: ${SHOP_CATEGORIES.join(", ")}`);
  }

  if (!Array.isArray(s.tags) || s.tags.length === 0) errors.push("tags: at least one");
  else {
    if (s.tags.length > 10) errors.push(`tags: ${s.tags.length}, the most is 10`);
    for (const t of s.tags) {
      if (typeof t !== "string" || !t.trim()) errors.push("tags: empty tag");
      else if (t !== t.toLowerCase()) errors.push(`tags: "${t}" must be lowercase`);
    }
  }

  const roomIds = ROOMS.map((r) => r.id as string);
  for (const r of s.rooms ?? []) {
    if (!roomIds.includes(r)) errors.push(`rooms: "${r}" is not one of ${roomIds.join(", ")}`);
  }

  if (s.defaultFinish !== undefined && !["unframed", "framed", "canvas"].includes(s.defaultFinish)) {
    errors.push("defaultFinish must be unframed, framed or canvas");
  }
  if (s.popularSize !== undefined && !SHOP_SIZE_LADDER.some((z) => z.id === s.popularSize)) {
    errors.push(`popularSize must be one of ${SHOP_SIZE_LADDER.map((z) => z.id).join(", ")}`);
  }

  return { spec: errors.length ? null : (s as ListingSpec), errors, warnings };
}
