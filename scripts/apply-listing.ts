/**
 * Write a listing's words into its Studio draft from a `listing.json` (`npm run shop:copy`).
 *
 *   npm run shop:copy -- --file "~/Pixel Prince/Bronx Neighborhood Map/listing.json"            dry run
 *   npm run shop:copy -- --file "~/Pixel Prince/Bronx Neighborhood Map/listing.json" --apply    write
 *
 * Sets title, short and long description, category, tags, rooms, default version and finish, and
 * the Popular size, after checking them against the house rules (lib/listing-spec.ts). Only ever
 * writes the DRAFT: when the print has none, the published version is copied to a draft first. So
 * nothing reaches the site until someone presses Publish in Studio, and that stays a human step.
 *
 * Needs SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) in .env.local.
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { validateListingSpec } from "../lib/listing-spec";

config({ path: resolve(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const fileArg = args.includes("--file") ? args[args.indexOf("--file") + 1] : undefined;
if (!fileArg) {
  console.error('Need --file <path to listing.json>. Add --apply to write.');
  process.exit(1);
}
const file = resolve(fileArg.replace(/^~/, process.env.HOME ?? "~"));
if (!existsSync(file)) {
  console.error(`No file at ${file}`);
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
  _type: string;
  title?: string;
  offers?: { _key: string; version?: string; sizes?: { _key: string; sizeId?: string }[] }[];
  [key: string]: unknown;
}

async function main() {
  const { spec, errors, warnings } = validateListingSpec(JSON.parse(readFileSync(file, "utf8")));
  for (const w of warnings) console.warn(`warn   ${w}`);
  if (!spec) {
    for (const e of errors) console.error(`error  ${e}`);
    console.error(`\n${errors.length} problem(s) in ${file}. Nothing written.`);
    process.exit(1);
  }

  const docs = await sanity.fetch<Doc[]>(`*[_type == "product" && listing == "shop" && title == $title]`, { title: spec.title });
  const published = docs.find((d) => !d._id.startsWith("drafts."));
  const draft = docs.find((d) => d._id.startsWith("drafts."));
  if (!published && !draft) {
    console.error(`No shop print titled "${spec.title}" in Studio. Run the Shop sync with "create drafts" first, or fix the title.`);
    process.exit(1);
  }

  const versions = [...new Set((draft ?? published)!.offers?.map((o) => o.version).filter(Boolean))];
  if (spec.defaultVersion && !versions.includes(spec.defaultVersion)) {
    console.error(`defaultVersion "${spec.defaultVersion}" is not one of this print's versions: ${versions.join(", ") || "none"}`);
    process.exit(1);
  }

  const target = draft?._id ?? `drafts.${published!._id}`;
  const set: Record<string, unknown> = {
    description: spec.description,
    category: spec.category,
    tags: spec.tags,
    ...(spec.longDescription !== undefined ? { longDescription: spec.longDescription } : {}),
    ...(spec.rooms !== undefined ? { rooms: spec.rooms } : {}),
    ...(spec.defaultVersion ? { defaultVersion: spec.defaultVersion } : {}),
    ...(spec.defaultFinish ? { defaultFinish: spec.defaultFinish } : {}),
  };
  if (spec.popularSize) {
    for (const offer of (draft ?? published)!.offers ?? []) {
      for (const size of offer.sizes ?? []) {
        set[`offers[_key=="${offer._key}"].sizes[_key=="${size._key}"].popular`] = size.sizeId === spec.popularSize;
      }
    }
  }

  console.log(`${apply ? "write" : "would write"} ${target}  ${spec.title}`);
  for (const [k, v] of Object.entries(set)) if (!k.startsWith("offers[")) console.log(`   ${k}: ${JSON.stringify(v)}`);
  if (spec.popularSize) console.log(`   popular size: ${spec.popularSize}`);
  if (!apply) {
    console.log("\nDry run. Add --apply to write the draft.");
    return;
  }

  if (!draft) {
    // Studio edits a draft beside the published document; start it from what is live.
    const rest: Record<string, unknown> = { ...published };
    for (const k of ["_id", "_rev", "_createdAt", "_updatedAt"]) delete rest[k];
    await sanity.createIfNotExists({ ...rest, _id: target, _type: published!._type });
  }
  await sanity.patch(target).set(set).commit();
  console.log(`\nDraft updated. Review and Publish it in Studio: https://www.thepixelprince.com/studio`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
