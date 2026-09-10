/**
 * Import Fourthwall products into Sanity as shop-print DRAFTS, or sync prices and
 * variant ids on prints that already exist (PLAN-40, finishes PLAN-46).
 *
 *   npx tsx scripts/import-fourthwall-products.ts                  dry run (log only)
 *   npx tsx scripts/import-fourthwall-products.ts --apply          create drafts + sync existing
 *   npx tsx scripts/import-fourthwall-products.ts --sync --apply   sync existing only, no new drafts
 *   add --include-test to also process products named "Test ..."
 *   Fourthwall's storefront publishes a dashboard change a minute or two late, so a sync run
 *   immediately after editing prices reads the old ones. Wait, then run it.
 *
 *   add --reset-images to throw away the photos in Studio and take Fourthwall's again.
 *     Photos are seeded on the first import and are yours after that (PLAN-52).
 *   add --no-trim to keep Fourthwall's wide dead margin around each mockup
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
import { chromium, type Browser } from "playwright";
import { contentBox } from "../lib/image-trim";
import { draftDescription, draftLongDescription, draftTags, imageAlt, imageFileName } from "../lib/listing-copy";
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
// --remockup was the old name, kept working so a memorised command does not fail
const resetImages = process.argv.includes("--reset-images") || process.argv.includes("--remockup");
const trim = !process.argv.includes("--no-trim");

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
  defaultVersion?: string;
  offers?: ExistingOffer[];
  galleryCount?: number;
}

/**
 * The artwork these products belong to. Matched by id, by any offer pointing at one of the
 * products, or by title, because recreating a product in Fourthwall changes its id and would
 * otherwise orphan the artwork and create a second one (learned the hard way, 2026-09-10).
 */
async function findExisting(artworkId: string, productIds: string[], title: string): Promise<ExistingDoc[]> {
  return sanity.fetch<ExistingDoc[]>(
    `*[_type == "product" && listing == "shop" && (_id in [$id, $draft] || count(offers[provider == "fourthwall" && providerProductId in $pids]) > 0 || title == $title)]{
      _id, title, defaultVersion, "galleryCount": count(galleryImages),
      offers[]{ _key, provider, finish, version, providerProductId, "hasMockup": defined(mockup.asset) }
    }`,
    { id: artworkId, draft: `drafts.${artworkId}`, pids: productIds, title }
  );
}

/**
 * Fourthwall renders every mockup on a flat background with a wide dead margin: a framed
 * poster fills 62% of the width and 55% of the height, so the print reads small in any
 * container. Chromium decodes the render, `contentBox` finds the product, and the crop is
 * uploaded instead. Without a browser the original is uploaded, so the import still works.
 */
let browser: Browser | null = null;
let browserFailed = false;

async function trimmed(buffer: Buffer, contentType: string): Promise<{ data: Buffer; type: string } | null> {
  if (!trim || browserFailed) return null;
  try {
    if (!browser) browser = await chromium.launch();
    const page = await browser.newPage();
    try {
      const dataUrl = `data:${contentType};base64,${buffer.toString("base64")}`;
      const cropped = await page.evaluate(async (src) => {
        const img = new Image();
        img.src = src;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const ctx = c.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        const { data, width, height } = ctx.getImageData(0, 0, c.width, c.height);
        return { pixels: Array.from(data), width, height };
      }, dataUrl);
      // 1280 keeps the crop sharp in a 640px column on a 2x screen
      const box = contentBox(Uint8ClampedArray.from(cropped.pixels), cropped.width, cropped.height, { minWidth: 1280 });
      if (!box) return null;
      const out = await page.evaluate(
        async ({ src, box }) => {
          const img = new Image();
          img.src = src;
          await img.decode();
          const c = document.createElement("canvas");
          c.width = box.width;
          c.height = box.height;
          c.getContext("2d")!.drawImage(img, box.x, box.y, box.width, box.height, 0, 0, box.width, box.height);
          return c.toDataURL("image/png");
        },
        { src: dataUrl, box }
      );
      return { data: Buffer.from(out.split(",")[1], "base64"), type: "image/png" };
    } finally {
      await page.close();
    }
  } catch (e) {
    console.warn(`warn   mockups will keep their margins: ${String(e).slice(0, 80)}`);
    browserFailed = true;
    return null;
  }
}

async function uploadImage(url: string, filename: string, label: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status} for ${label}`);
  const original = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") ?? "image/webp";
  const crop = await trimmed(original, contentType);
  const asset = await sanity.assets.upload("image", crop?.data ?? original, {
    filename: crop ? filename.replace(/\.[^.]+$/, ".png") : filename,
    contentType: crop?.type ?? contentType,
  });
  return asset._id;
}

function imageRef(assetId: string) {
  return { _type: "image", asset: { _type: "reference", _ref: assetId } };
}

/** The shop page shows the main image about 1280 device pixels wide, so anything smaller is soft. */
const MIN_MAIN_IMAGE_WIDTH = 1200;

async function uploadFirstImage(p: FwProduct, filename: string): Promise<string | null> {
  const img = p.images?.[0];
  if (!img?.url) return null;
  if (typeof img.width === "number" && img.width > 0 && img.width < MIN_MAIN_IMAGE_WIDTH) {
    console.warn(
      `warn   ${p.name}: the first image is only ${img.width}x${img.height ?? "?"} px. The page shows it about 1280 px wide, so it will look soft. Upload one at least 1600 px wide in Fourthwall.`
    );
  }
  return uploadImage(img.url, filename, p.name);
}

/** Up to three more Fourthwall renders as the artwork's room photos. */
async function uploadGallery(p: FwProduct) {
  const { title, version, finish } = splitProductName(p.name);
  const extras = pickGalleryImages(p);
  const items = [];
  for (const [i, img] of extras.entries()) {
    const naming = { title, version, finish, kind: "room" as const, index: i + 1 };
    const assetId = await uploadImage(img.url, imageFileName(naming), p.name);
    items.push({ _key: `fw-wall-${i + 1}`, ...imageRef(assetId), alt: imageAlt(naming) });
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

async function buildOffer(fp: FinishProduct, title: string) {
  const mockupId = await uploadFirstImage(
    fp.product,
    imageFileName({ title, version: fp.version, finish: fp.finish, kind: "main" })
  );
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
    const existing = await findExisting(artworkId, finishProducts.map((f) => f.product.id), title);
    const finishList = finishProducts.map((f) => `${offerLabel(f)} (${f.sizes.length} sizes)`).join(", ");

    if (existing.length > 0) {
      for (const doc of existing) {
        console.log(`${apply ? "sync  " : "would sync"} ${doc._id}  ${doc.title ?? title}: ${finishList}`);
        if (!apply) continue;
        if (resetImages) {
          const photos = (doc.offers ?? []).filter((o) => o.hasMockup).length;
          console.warn(
            `reset  ${doc.title ?? title}: replacing the photos on ${photos} offer(s) with Fourthwall's. Anything uploaded in Studio for this print is lost.`
          );
        }
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
            if (!offer.hasMockup || resetImages) {
              const mockupId = await uploadFirstImage(
                fp.product,
                imageFileName({ title, version: fp.version, finish: fp.finish, kind: "main" })
              );
              if (mockupId) patch[`offers[_key=="${offer._key}"].mockup`] = imageRef(mockupId);
            }
            await sanity.patch(doc._id).set(patch).commit();
          } else {
            const built = await buildOffer(fp, title);
            claimed.add(built._key);
            await sanity.patch(doc._id).setIfMissing({ offers: [] }).append("offers", [built]).commit();
            console.log(`offer  ${doc._id}: ${offerLabel(fp)} added`);
          }
        }
        // Room photos belong to the artwork, not to one variant of it (PLAN-52). Seeded from
        // Fourthwall the first time so a listing is never blank, and Kenny's after that. They come
        // from the version the page opens on, so the seeded photos match what a visitor first sees.
        const preferred = finishProducts.find((f) => f.version && f.version === doc.defaultVersion);
        const primary = (preferred ?? finishProducts[0]).product;
        if ((!doc.galleryCount || resetImages) && pickGalleryImages(primary).length > 0) {
          const gallery = await uploadGallery(primary);
          await sanity.patch(doc._id).set({ galleryImages: gallery }).commit();
          console.log(`photos ${doc._id}: ${gallery.length} room photo(s) ${doc.galleryCount ? "replaced" : "added"}`);
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

    const assetId = await uploadFirstImage(primary, imageFileName({ title, version: finishProducts[0].version, finish: finishProducts[0].finish, kind: "main" }));
    const gallery = await uploadGallery(primary);
    const offers = [];
    for (const fp of finishProducts) offers.push(await buildOffer(fp, title));
    const versions = [...new Set(finishProducts.map((f) => f.version).filter((v): v is string => !!v))];
    const finishes = [...new Set(finishProducts.map((f) => f.finish))];
    const copy = { title, category, versions, finishes };
    // Fourthwall's own description wins when there is one; otherwise write a real first draft
    // rather than a placeholder, so the listing could go live as it stands (PLAN-52).
    const description = stripHtml(primary.description).slice(0, 200) || draftDescription(copy);
    await sanity.createIfNotExists({
      _id: `drafts.${artworkId}`,
      _type: "product",
      listing: "shop",
      kind: inferKind(title),
      title: title,
      slug: { _type: "slug", current: slugify(title) },
      artist: "The Pixel Prince",
      description,
      longDescription: draftLongDescription(copy),
      ...(assetId ? { previewImage: imageRef(assetId) } : {}),
      ...(gallery.length ? { galleryImages: gallery } : {}),
      ...(category ? { category } : {}),
      tags: draftTags(copy),
      offers,
    });
  }

  if (browser) await browser.close();
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
