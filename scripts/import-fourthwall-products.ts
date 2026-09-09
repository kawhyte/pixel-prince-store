/**
 * Import Fourthwall products into Sanity as shop-print DRAFTS, or sync prices and
 * variant ids on prints that already exist (PLAN-40, finishes PLAN-46).
 *
 *   npx tsx scripts/import-fourthwall-products.ts                  dry run (log only)
 *   npx tsx scripts/import-fourthwall-products.ts --apply          create drafts + sync existing
 *   npx tsx scripts/import-fourthwall-products.ts --sync --apply   sync existing only, no new drafts
 *   add --include-test to also process products named "Test ..."
 *
 * Naming convention: "Title", "Title | Framed", "Title | Canvas" are one artwork with three
 * finishes (lib/fourthwall-import.ts splitFinish). Each finish becomes one printOffer with
 * its own product id, sizes, prices and mockup.
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
  type ImportFinish,
  inferCategory,
  inferKind,
  isImportable,
  mapVariantsToSizes,
  pickGalleryImages,
  sanityIdForArtwork,
  slugify,
  splitProductName,
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
const FINISH_ORDER: ImportFinish[] = ["unframed", "framed", "canvas"];

async function fetchProducts(): Promise<FwProduct[]> {
  // the listing is CDN-cached for ~60s, which serves a stale catalogue right after a publish;
  // an unused parameter makes the URL unique so the import always reads Fourthwall as it is now
  const url = `${FW_BASE}/collections/all/products?pageSize=100&storefront_token=${encodeURIComponent(storefrontToken!)}&_=${Date.now()}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fourthwall ${res.status} ${res.statusText}`);
  const data = (await res.json()) as { results?: FwProduct[]; paging?: { hasNextPage?: boolean } };
  if (data.paging?.hasNextPage) console.warn("warn   more than one page of products; only the first page is processed");
  return data.results ?? [];
}

interface ExistingOffer {
  _key: string;
  provider?: string;
  finish?: string;
  version?: string;
  providerProductId?: string;
  hasMockup?: boolean;
}
interface ExistingDoc {
  _id: string;
  title?: string;
  offers?: ExistingOffer[];
  galleryCount?: number;
}

async function findExisting(artworkId: string, productIds: string[]): Promise<ExistingDoc[]> {
  return sanity.fetch<ExistingDoc[]>(
    `*[_type == "product" && (_id in [$id, $draft] || count(offers[provider == "fourthwall" && providerProductId in $pids]) > 0)]{
      _id, title, "galleryCount": count(galleryImages),
      offers[]{ _key, provider, finish, version, providerProductId, "hasMockup": defined(mockup.asset) }
    }`,
    { id: artworkId, draft: `drafts.${artworkId}`, pids: productIds }
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

function imageRef(assetId: string) {
  return { _type: "image", asset: { _type: "reference", _ref: assetId } };
}

async function uploadFirstImage(p: FwProduct, suffix: string): Promise<string | null> {
  const img = p.images?.[0];
  if (!img?.url) return null;
  return uploadImage(img.url, `${p.slug ?? slugify(p.name)}${suffix}.webp`, p.name);
}

/** Up to three more Fourthwall mockups as gallery photos (thumbnails on the shop page). */
async function uploadGallery(p: FwProduct) {
  const extras = pickGalleryImages(p);
  const items = [];
  for (const [i, img] of extras.entries()) {
    const assetId = await uploadImage(img.url, `${p.slug ?? slugify(p.name)}-mockup-${i + 2}.webp`, p.name);
    items.push({ _key: `fw-mockup-${i + 2}`, ...imageRef(assetId), alt: `${p.name}, mockup ${i + 2}` });
  }
  return items;
}

/** One Fourthwall product is one offer: a version of the artwork (PLAN-48) in one finish. */
interface FinishProduct {
  product: FwProduct;
  finish: ImportFinish;
  /** null when the artwork has a single version */
  version: string | null;
  sizes: ReturnType<typeof mapVariantsToSizes>["sizes"];
}

function offerKey(fp: FinishProduct): string {
  return fp.version ? `fw-${slugify(fp.version)}-${fp.finish}` : `fw-${fp.finish}`;
}

function offerLabel(fp: FinishProduct): string {
  return fp.version ? `${fp.version} ${fp.finish}` : fp.finish;
}

async function buildOffer(fp: FinishProduct) {
  const suffix = fp.version ? `-${slugify(fp.version)}-${fp.finish}` : `-${fp.finish}`;
  const mockupId = await uploadFirstImage(fp.product, suffix);
  return {
    _type: "printOffer",
    _key: offerKey(fp),
    provider: "fourthwall",
    finish: fp.finish,
    ...(fp.version ? { version: fp.version } : {}),
    active: true,
    providerProductId: fp.product.id,
    sizes: fp.sizes,
    ...(mockupId ? { mockup: imageRef(mockupId) } : {}),
  };
}

async function main() {
  const products = (await fetchProducts()).filter((p) => isImportable(p, includeTest));
  if (products.length === 0) {
    console.log("No importable products (public + available). Nothing to do.");
    return;
  }

  // Group by title: "Title", "Title | Framed", "Title (Ivory)", "Title (Ivory) | Canvas" are one artwork.
  const groups = new Map<string, FwProduct[]>();
  for (const p of products) {
    const { title } = splitProductName(p.name);
    groups.set(title, [...(groups.get(title) ?? []), p]);
  }

  let failures = 0;
  for (const [title, members] of groups) {
    const finishProducts: FinishProduct[] = [];
    for (const p of members) {
      const { finish, version } = splitProductName(p.name);
      if (finishProducts.some((f) => f.finish === finish && f.version === version)) {
        console.error(`skip   ${p.name}: a second "${version ? `${version} ` : ""}${finish}" product for "${title}", rename one`);
        failures++;
        continue;
      }
      const { sizes, skipped } = mapVariantsToSizes(p.variants ?? []);
      for (const label of skipped) console.warn(`warn   ${p.name}: variant "${label}" is not in the size ladder, skipped`);
      if (sizes.length === 0) {
        console.error(`skip   ${p.name}: no ladder sizes (fix the product in Fourthwall)`);
        failures++;
        continue;
      }
      finishProducts.push({ product: p, finish, version, sizes });
    }
    if (finishProducts.length === 0) continue;
    // versions alphabetically (the first one is the default on the page), finishes in FINISH_ORDER
    finishProducts.sort(
      (a, b) =>
        (a.version ?? "").localeCompare(b.version ?? "") || FINISH_ORDER.indexOf(a.finish) - FINISH_ORDER.indexOf(b.finish),
    );

    const artworkId = sanityIdForArtwork(finishProducts.map((f) => f.product));
    const existing = await findExisting(artworkId, finishProducts.map((f) => f.product.id));
    const finishList = finishProducts.map((f) => `${offerLabel(f)} (${f.sizes.length} sizes)`).join(", ");

    if (existing.length > 0) {
      for (const doc of existing) {
        console.log(`${apply ? "sync  " : "would sync"} ${doc._id}  ${doc.title ?? title}: ${finishList}`);
        if (!apply) continue;
        const claimed = new Set<string>();
        for (const fp of finishProducts) {
          const fw = (doc.offers ?? []).filter((o) => o.provider === "fourthwall" && !claimed.has(o._key));
          // the product id is the truth; fall back to a matching version and finish for offers typed by hand
          const offer =
            fw.find((o) => o.providerProductId === fp.product.id) ??
            fw.find((o) => (o.finish ?? "unframed") === fp.finish && (o.version ?? null) === fp.version);
          if (offer) {
            claimed.add(offer._key);
            const patch: Record<string, unknown> = {
              [`offers[_key=="${offer._key}"].sizes`]: fp.sizes,
              [`offers[_key=="${offer._key}"].providerProductId`]: fp.product.id,
              [`offers[_key=="${offer._key}"].finish`]: fp.finish,
            };
            if (fp.version) patch[`offers[_key=="${offer._key}"].version`] = fp.version;
            if (!offer.hasMockup) {
              const suffix = fp.version ? `-${slugify(fp.version)}-${fp.finish}` : `-${fp.finish}`;
              const mockupId = await uploadFirstImage(fp.product, suffix);
              if (mockupId) patch[`offers[_key=="${offer._key}"].mockup`] = imageRef(mockupId);
            }
            await sanity.patch(doc._id).set(patch).commit();
          } else {
            const built = await buildOffer(fp);
            claimed.add(built._key);
            await sanity.patch(doc._id).setIfMissing({ offers: [] }).append("offers", [built]).commit();
            console.log(`offer  ${doc._id}: ${offerLabel(fp)} added`);
          }
        }
        const primary = finishProducts[0].product;
        if (!doc.galleryCount && pickGalleryImages(primary).length > 0) {
          const gallery = await uploadGallery(primary);
          await sanity.patch(doc._id).set({ galleryImages: gallery }).commit();
          console.log(`gallery ${doc._id}: ${gallery.length} mockup(s) added`);
        }
      }
      continue;
    }

    if (syncOnly) {
      console.log(`skip   ${title}: not in Sanity yet (run without --sync to create a draft)`);
      continue;
    }

    const primary = finishProducts[0].product;
    const category = inferCategory(title);
    console.log(`${apply ? "create" : "would create"} draft ${title}: ${finishList}, category ${category ?? "none"}`);
    if (!apply) continue;

    const assetId = await uploadFirstImage(primary, "");
    const gallery = await uploadGallery(primary);
    const offers = [];
    for (const fp of finishProducts) offers.push(await buildOffer(fp));
    const description = stripHtml(primary.description).slice(0, 200) || `${title}. [KENNY: write this]`;
    await sanity.createIfNotExists({
      _id: `drafts.${artworkId}`,
      _type: "product",
      listing: "shop",
      kind: inferKind(title),
      title: title,
      slug: { _type: "slug", current: slugify(title) },
      artist: "The Pixel Prince",
      description,
      ...(assetId ? { previewImage: imageRef(assetId) } : {}),
      ...(gallery.length ? { galleryImages: gallery } : {}),
      ...(category ? { category } : {}),
      tags: [],
      offers,
    });
  }

  console.log(`\n${groups.size} artwork(s) from ${products.length} product(s) processed${apply ? "" : " (dry run; add --apply to write)"}.`);
  if (failures > 0 && apply) {
    console.error(`${failures} product(s) were skipped.`);
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
