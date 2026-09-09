/**
 * Attach the flat artwork to shop offers (PLAN-49).
 *
 *   npx tsx scripts/upload-flat-art.ts --dir ./masters                  dry run
 *   npx tsx scripts/upload-flat-art.ts --dir ./masters --apply          upload + patch
 *   options: --preview  also set the artwork's card image  --only "Brooklyn Neighborhood Map"
 *
 * A master file named "Title (Version).png" is matched to the Sanity artwork "Title" and to every
 * offer of that version, so the page can lead with the artwork itself instead of a grey mockup.
 * Files are downscaled with sips before upload when it is available (macOS); otherwise the master
 * is uploaded as it is and Sanity serves resized copies.
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { execFileSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync } from "fs";
import { tmpdir } from "os";
import { readdirSync } from "fs";
import { join, resolve } from "path";
import { listMasterFiles, titleFromFilename } from "../lib/fourthwall-platform";
import { splitVersion } from "../lib/fourthwall-import";

config({ path: resolve(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string, d?: string) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};

const dir = opt("--dir", "./masters")!;
const apply = flag("--apply");
const withPreview = flag("--preview");
const only = opt("--only");
const MAX_EDGE = 2400;

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

interface OfferRow {
  _key: string;
  version?: string;
  finish?: string;
  hasArt?: boolean;
}
interface DocRow {
  _id: string;
  title: string;
  offers?: OfferRow[];
}

/** Downscale so the page is not served a 10 MB master. Returns the original path when sips is missing. */
function webSized(path: string, tmp: string): string {
  const out = join(tmp, "flat.png");
  try {
    execFileSync("sips", ["-Z", String(MAX_EDGE), "-s", "format", "png", path, "--out", out], { stdio: "ignore" });
    return out;
  } catch {
    console.warn("warn   sips unavailable, uploading the full master");
    return path;
  }
}

async function main() {
  const root = resolve(dir);
  const masters = listMasterFiles(root, (d) => readdirSync(d, { withFileTypes: true }));
  if (masters.length === 0) {
    console.log(`No masters in ${dir}`);
    return;
  }

  const docs = await sanity.fetch<DocRow[]>(
    `*[_type == "product" && listing == "shop"]{ _id, title, offers[]{ _key, version, finish, "hasArt": defined(art.asset) } }`
  );

  let patched = 0;
  let skipped = 0;
  for (const master of masters) {
    const { title, version } = splitVersion(titleFromFilename(master.file));
    if (only && title !== only) continue;
    const targets = docs.filter((d) => d.title === title);
    if (targets.length === 0) {
      console.warn(`skip   ${master.path}: no shop artwork titled "${title}" (import it first)`);
      skipped++;
      continue;
    }

    for (const doc of targets) {
      const offers = (doc.offers ?? []).filter((o) => (o.version ?? null) === version);
      if (offers.length === 0) {
        console.warn(`skip   ${doc._id}: no ${version ?? "single version"} offers for "${title}"`);
        skipped++;
        continue;
      }
      const label = `${title}${version ? ` (${version})` : ""}`;
      console.log(`${apply ? "attach" : "would attach"} ${label} -> ${offers.length} offer(s)${withPreview ? " + card image" : ""}`);
      if (!apply) continue;

      const tmp = mkdtempSync(join(tmpdir(), "flat-art-"));
      try {
        const path = webSized(join(root, master.path), tmp);
        const asset = await sanity.assets.upload("image", readFileSync(path), {
          filename: `${master.file.replace(/\.[^.]+$/, "")}.png`,
          contentType: "image/png",
        });
        const image = { _type: "image", asset: { _type: "reference", _ref: asset._id } };
        const patch: Record<string, unknown> = {};
        for (const o of offers) patch[`offers[_key=="${o._key}"].art`] = image;
        // the card image should be the artwork too, taken from whichever version sorts first
        const firstVersion = [...new Set((doc.offers ?? []).map((o) => o.version ?? ""))].sort()[0];
        if (withPreview && (version ?? "") === firstVersion) patch.previewImage = image;
        await sanity.patch(doc._id).set(patch).commit();
        patched++;
      } finally {
        rmSync(tmp, { recursive: true, force: true });
      }
    }
  }

  console.log(`\n${patched} document patch(es), ${skipped} skipped${apply ? "." : " (dry run; add --apply to write)."}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
