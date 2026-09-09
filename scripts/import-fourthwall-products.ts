/**
 * Import Fourthwall products into Sanity as shop-print DRAFTS, or sync prices and
 * variant ids on prints that already exist (PLAN-40).
 *
 *   npx tsx scripts/import-fourthwall-products.ts                  dry run (log only)
 *   npx tsx scripts/import-fourthwall-products.ts --apply          create drafts + sync existing
 *   npx tsx scripts/import-fourthwall-products.ts --sync --apply   sync existing only, no new drafts
 *   add --include-test to also process products named "Test ..."
 *
 * Needs in .env.local: FOURTHWALL_STOREFRONT_TOKEN (read-only) and
 * SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN). Never publishes: new prints land in
 * drafts.<id> for Kenny to finish (description, category, tags) and publish in Studio.
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { resolve } from "path";
import {
  type FwProduct,
  inferCategory,
  inferKind,
  isImportable,
  mapVariantsToSizes,
  pickGalleryImages,
  sanityIdForFourthwallProduct,
  slugify,
  stripHtml,
} from "../lib/fourthwall-import";

config({ path: resolve(__dirname, "../.env.local") });

const storefrontToken = process.env.FOURTHWALL_STOREFRONT_TOKEN;
const sanityToken = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
if (!storefrontToken) throw new Error("FOURTHWALL_STOREFRONT_TOKEN missing in .env.local");
if (!sanityToken) throw new Error("SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) missing in .env.local");

const apply = process.argv.includes("--apply");
const syncOnly = process.argv.includes("--sync");
const includeTest = process.argv.includes("--include-test");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-11-27",
  token: sanityToken,
  useCdn: false,
  perspective: "raw", // drafts AND published
});

const FW_BASE = "https://storefront-api.fourthwall.com/v1";

async function fetchProducts(): Promise<FwProduct[]> {
  const url = `${FW_BASE}/collections/all/products?pageSize=100&storefront_token=${encodeURIComponent(storefrontToken!)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fourthwall ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { results?: FwProduct[]; paging?: { hasNextPage?: boolean } };
  if (data.paging?.hasNextPage) console.warn("warn   more than one page of products; only the first page is processed");
  return data.results ?? [];
}

interface ExistingDoc {
  _id: string;
  title?: string;
  offers?: { _key: string; provider?: string; providerProductId?: string }[];
  galleryCount?: number;
}

async function findExisting(p: FwProduct): Promise<ExistingDoc[]> {
  const id = sanityIdForFourthwallProduct(p.id);
  return sanity.fetch<ExistingDoc[]>(
    `*[_type == "product" && (_id in [$id, $draft] || $pid in offers[provider == "fourthwall"].providerProductId)]{ _id, title, offers, "galleryCount": count(galleryImages) }`,
    { id, draft: `drafts.${id}`, pid: p.id }
  );
}

async function uploadImage(url: string, filename: string, label: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status} for ${label}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const asset = await sanity.assets.upload("image", buffer, {
    filename,
    contentType: res.headers.get("content-type") ?? "image/webp",
  });
  return asset._id;
}

async function uploadPreview(p: FwProduct): Promise<string | null> {
  const img = p.images?.[0];
  if (!img?.url) return null;
  return uploadImage(img.url, `${p.slug ?? slugify(p.name)}.webp`, p.name);
}

/** Up to three more Fourthwall mockups as gallery photos (thumbnails on the shop page). */
async function uploadGallery(p: FwProduct) {
  const extras = pickGalleryImages(p);
  const items = [];
  for (const [i, img] of extras.entries()) {
    const assetId = await uploadImage(img.url, `${p.slug ?? slugify(p.name)}-mockup-${i + 2}.webp`, p.name);
    items.push({
      _type: "image",
      _key: `fw-mockup-${i + 2}`,
      asset: { _type: "reference", _ref: assetId },
      alt: `${p.name}, mockup ${i + 2}`,
    });
  }
  return items;
}

async function main() {
  const products = (await fetchProducts()).filter((p) => isImportable(p, includeTest));
  if (products.length === 0) {
    console.log("No importable products (public + available). Nothing to do.");
    return;
  }
  let failures = 0;

  for (const p of products) {
    const { sizes, skipped } = mapVariantsToSizes(p.variants ?? []);
    for (const label of skipped) console.warn(`warn   ${p.name}: variant "${label}" is not in the size ladder, skipped`);
    if (sizes.length === 0) {
      console.error(`skip   ${p.name}: no ladder sizes (fix the product in Fourthwall)`);
      failures++;
      continue;
    }

    const existing = await findExisting(p);
    if (existing.length > 0) {
      for (const doc of existing) {
        const offer = doc.offers?.find((o) => o.provider === "fourthwall");
        console.log(`${apply ? "sync  " : "would sync"} ${doc._id}  ${doc.title ?? p.name}: ${sizes.length} sizes`);
        if (!apply) continue;
        if (offer) {
          await sanity
            .patch(doc._id)
            .set({
              [`offers[_key=="${offer._key}"].sizes`]: sizes,
              [`offers[_key=="${offer._key}"].providerProductId`]: p.id,
            })
            .commit();
          if (!doc.galleryCount && pickGalleryImages(p).length > 0) {
            const gallery = await uploadGallery(p);
            await sanity.patch(doc._id).set({ galleryImages: gallery }).commit();
            console.log(`gallery ${doc._id}: ${gallery.length} mockup(s) added`);
          }
        } else {
          await sanity
            .patch(doc._id)
            .setIfMissing({ offers: [] })
            .append("offers", [
              { _type: "printOffer", _key: "fw", provider: "fourthwall", active: true, providerProductId: p.id, sizes },
            ])
            .commit();
        }
      }
      continue;
    }

    if (syncOnly) {
      console.log(`skip   ${p.name}: not in Sanity yet (run without --sync to create a draft)`);
      continue;
    }

    const category = inferCategory(p.name);
    console.log(
      `${apply ? "create" : "would create"} draft ${p.name}: ${sizes.length} sizes, category ${category ?? "none"}`
    );
    if (!apply) continue;

    const assetId = await uploadPreview(p);
    const gallery = await uploadGallery(p);
    const description = stripHtml(p.description).slice(0, 200) || `${p.name}. [KENNY: write this]`;
    const draftId = `drafts.${sanityIdForFourthwallProduct(p.id)}`;
    await sanity.createIfNotExists({
      _id: draftId,
      _type: "product",
      listing: "shop",
      kind: inferKind(p.name),
      title: p.name,
      slug: { _type: "slug", current: p.slug ?? slugify(p.name) },
      artist: "The Pixel Prince",
      description,
      ...(assetId ? { previewImage: { _type: "image", asset: { _type: "reference", _ref: assetId } } } : {}),
      ...(gallery.length ? { galleryImages: gallery } : {}),
      ...(category ? { category } : {}),
      tags: [],
      offers: [{ _type: "printOffer", _key: "fw", provider: "fourthwall", active: true, providerProductId: p.id, sizes }],
    });
  }

  console.log(`\n${products.length} product(s) processed${apply ? "" : " (dry run; add --apply to write)"}.`);
  if (failures > 0 && apply) {
    console.error(`${failures} product(s) had no ladder sizes.`);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
