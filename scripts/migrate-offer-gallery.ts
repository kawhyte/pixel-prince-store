/**
 * One-off migration (PLAN-52): room photos move from the offer up to the artwork.
 *
 *   npx tsx scripts/migrate-offer-gallery.ts            dry run
 *   npx tsx scripts/migrate-offer-gallery.ts --apply
 *
 * PLAN-51 put room photos on each offer, which meant the same three photos were stored four
 * times over and had to be edited inside an array item. A photo of a print on a wall is true of
 * the artwork, so it belongs on the artwork. This copies them up, de-duplicating by asset, and
 * removes the per-offer copies.
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const apply = process.argv.includes("--apply");
const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
if (!token) throw new Error("SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) missing in .env.local");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-11-27",
  token,
  useCdn: false,
  perspective: "raw",
});

interface Photo {
  _key?: string;
  alt?: string;
  asset?: { _ref?: string };
}
interface Row {
  _id: string;
  title?: string;
  galleryImages?: Photo[];
  offers?: { _key: string; gallery?: Photo[] }[];
}

/** Room photos an artwork should end up with: what it already had, then anything new from the offers. */
const MAX_ROOM_PHOTOS = 8;

async function main() {
  const rows = await sanity.fetch<Row[]>(
    `*[_type == "product" && count(offers[count(gallery) > 0]) > 0]{
      _id, title, galleryImages, offers[]{ _key, gallery }
    }`
  );
  if (rows.length === 0) {
    console.log("No offers carry room photos. Nothing to migrate.");
    return;
  }

  for (const row of rows) {
    // keep what the artwork already shows, then add the offer photos it does not have yet
    const seen = new Set<string>();
    const photos: Record<string, unknown>[] = [];
    const take = (image: Photo, source: string) => {
      const ref = image.asset?._ref;
      if (!ref || seen.has(ref) || photos.length >= MAX_ROOM_PHOTOS) return;
      seen.add(ref);
      photos.push({
        _type: "image",
        _key: `${source}-${photos.length + 1}`,
        asset: { _type: "reference", _ref: ref },
        ...(image.alt ? { alt: image.alt } : {}),
      });
    };
    const had = (row.galleryImages ?? []).length;
    for (const image of row.galleryImages ?? []) take(image, "kept");
    for (const offer of row.offers ?? []) for (const image of offer.gallery ?? []) take(image, "moved");

    const offersWithPhotos = (row.offers ?? []).filter((o) => (o.gallery ?? []).length > 0).length;
    console.log(
      `${apply ? "move  " : "would move"} ${row._id}  ${row.title ?? ""}: ${had} kept + ${photos.length - had} moved from ${offersWithPhotos} offer(s) = ${photos.length} room photo(s)`
    );
    if (!apply) continue;

    let patch = sanity.patch(row._id).set({ galleryImages: photos });
    for (const offer of row.offers ?? []) patch = patch.unset([`offers[_key=="${offer._key}"].gallery`]);
    await patch.commit();
  }

  console.log(`\n${rows.length} artwork(s) ${apply ? "migrated" : "would be migrated"}.${apply ? "" : " Re-run with --apply to write."}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
