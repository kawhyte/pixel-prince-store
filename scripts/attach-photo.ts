/**
 * Put a photo onto a print without wrestling the Studio field (PLAN-53 follow up).
 *
 *   npx tsx scripts/attach-photo.ts --file ~/Desktop/brooklyn.png --title "Brooklyn Neighborhood Map" \
 *     --version Earth --finish framed --apply
 *
 *   ...same but add it to the artwork's room photos instead of one offer:
 *     --room --apply
 *
 * Names the asset and writes alt text from the product facts, the same as the import does, and
 * refuses quietly small files unless you insist with --force.
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { readFileSync, existsSync } from "fs";
import { resolve, extname } from "path";
import { readImageDims } from "../lib/fourthwall-platform";
import { imageAlt, imageFileName } from "../lib/listing-copy";
import { MIN_SHOP_IMAGE_WIDTH } from "../sanity/lib/image-rules";

config({ path: resolve(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string, d?: string) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};

const file = opt("--file");
const title = opt("--title");
const version = opt("--version") || null;
const finish = opt("--finish", "unframed")!;
const asRoom = flag("--room");
const apply = flag("--apply");
const force = flag("--force");

if (!file || !title) {
  console.error('Need --file <path> and --title "Artwork title". Add --version and --finish, or --room.');
  process.exit(1);
}
const path = resolve(file.replace(/^~/, process.env.HOME ?? "~"));
if (!existsSync(path)) {
  console.error(`No file at ${path}`);
  process.exit(1);
}

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

interface Doc {
  _id: string;
  offers?: { _key: string; version?: string; finish?: string }[];
  galleryCount: number;
}

async function main() {
  const bytes = new Uint8Array(readFileSync(path));
  const dims = readImageDims(bytes);
  if (!dims) {
    console.error(`${path} is not a PNG or JPEG.`);
    process.exit(1);
  }
  console.log(`${path}\n   ${dims.width} x ${dims.height} px`);
  if (dims.width < MIN_SHOP_IMAGE_WIDTH && !force) {
    console.error(`   Too small. The shop needs about ${MIN_SHOP_IMAGE_WIDTH} px wide. Use a bigger file, or --force.`);
    process.exit(1);
  }

  const docs = await sanity.fetch<Doc[]>(
    `*[_type == "product" && title == $title]{ _id, offers[]{_key, version, finish}, "galleryCount": count(galleryImages) }`,
    { title }
  );
  if (docs.length === 0) {
    console.error(`No artwork titled "${title}".`);
    process.exit(1);
  }

  const naming = { title: title!, version, finish, kind: asRoom ? ("room" as const) : ("main" as const) };
  for (const doc of docs) {
    const target = asRoom
      ? null
      : (doc.offers ?? []).find((o) => (o.version ?? null) === version && (o.finish ?? "unframed") === finish);
    if (!asRoom && !target) {
      console.error(`   ${doc._id}: no ${version ?? "single version"} ${finish} offer. Offers are: ${(doc.offers ?? []).map((o) => `${o.version ?? "-"} ${o.finish}`).join(", ")}`);
      continue;
    }
    const where = asRoom ? `room photo ${doc.galleryCount + 1}` : `${version ?? ""} ${finish} main photo`.trim();
    console.log(`${apply ? "attach" : "would attach"} to ${doc._id}: ${where}`);
    if (!apply) continue;

    const index = asRoom ? doc.galleryCount + 1 : undefined;
    const asset = await sanity.assets.upload("image", readFileSync(path), {
      filename: imageFileName({ ...naming, index }, extname(path).slice(1) || "png"),
      contentType: dims.contentType,
    });
    const image = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
    if (asRoom) {
      await sanity
        .patch(doc._id)
        .setIfMissing({ galleryImages: [] })
        .append("galleryImages", [{ ...image, _key: `photo-${Date.now()}`, alt: imageAlt({ ...naming, index }) }])
        .commit();
    } else {
      await sanity.patch(doc._id).set({ [`offers[_key=="${target!._key}"].mockup`]: image }).commit();
    }
    console.log(`   done, ${dims.width} px`);
  }

  console.log(apply ? "\nGive the page a minute, then reload." : "\nAdd --apply to write.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
