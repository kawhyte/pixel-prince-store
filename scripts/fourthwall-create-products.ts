/**
 * Create Fourthwall products from a folder of print files (PLAN-47).
 *
 *   npx tsx scripts/fourthwall-create-products.ts --dir ./masters                 dry run
 *   npx tsx scripts/fourthwall-create-products.ts --dir ./masters --apply         upload + create (hidden)
 *   options: --margin-poster 18  --margin-framed 30  --frames "Black,Red Oak,White"  --publish  --only "Sweden Map"  --canvas
 *
 * Per file (title = file name without extension): one media upload, then the unframed poster
 * ("Title") and the framed poster ("Title | Framed"). Existing names are skipped, so re-runs are
 * safe. Canvas cannot be created through the API and is on hold; pass --canvas for a per print
 * reminder of the dashboard steps.
 *
 * Needs FOURTHWALL_API_USER and FOURTHWALL_API_PASSWORD in .env.local (Settings > For Developers,
 * Create API User). Full-access credentials: never NEXT_PUBLIC_, never in Vercel.
 */
import { config } from "dotenv";
import { readdirSync, readFileSync } from "fs";
import { resolve, join } from "path";
import { DEFAULT_RATIO, FULL_LADDER, RATIO_FAMILIES, ratioTag, scopeFromTag, type LadderScope } from "../config/commerce";
import {
  createDesignProduct,
  createPlatformClient,
  detectRatio,
  listMasterFiles,
  masterQuality,
  orientationRefusal,
  ratioTagFromFilename,
  sizeNamesFor,
  whiteGroundVerdict,
  type EdgePixel,
  type ImageDims,
  listAllProducts,
  productName,
  readImageDims,
  titleFromFilename,
  uploadMedia,
  FRAME_COLORS,
  SIZE_NAMES,
  PlatformError,
} from "../lib/fourthwall-platform";

config({ path: resolve(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const opt = (name: string, fallback?: string) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};

const dir = opt("--dir");
if (!dir) throw new Error("--dir <folder of masters> is required");
const apply = flag("--apply");
const publish = flag("--publish");
const only = opt("--only");
// Canvas is on hold (Kenny, 2026-09-10). The API cannot create it, so it is a dashboard job;
// pass --canvas to be reminded of it per print when that changes.
const wantCanvas = flag("--canvas");
const canvasReminder = (title: string) => {
  if (!wantCanvas) return;
  console.log(`canvas ${productName(title, "canvas")}: create in the dashboard from Canvas (in), sizes ${SIZE_NAMES.canvas.join(" / ")}`);
};
const marginPoster = Number(opt("--margin-poster", "18"));
const marginFramed = Number(opt("--margin-framed", "30"));
const frameColors = (opt("--frames", FRAME_COLORS.join(",")) ?? "").split(",").map((s) => s.trim()).filter(Boolean) as (typeof FRAME_COLORS)[number][];
if (frameColors.length === 0 || frameColors.some((c) => !FRAME_COLORS.includes(c))) throw new Error(`--frames must list some of ${FRAME_COLORS.join(", ")}`);

const user = process.env.FOURTHWALL_API_USER;
const password = process.env.FOURTHWALL_API_PASSWORD;
if (!user || !password) throw new Error("FOURTHWALL_API_USER / FOURTHWALL_API_PASSWORD missing in .env.local");

const client = createPlatformClient(user, password);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * The darkest pixel along each of the master's four edges.
 *
 * Only the outer ring matters: Fourthwall leaves the rest of the sheet as bare paper, and the band
 * meets the artwork along its edge. A strip rather than a single row because an exported edge can
 * carry a row or two of antialiasing, and the darkest pixel rather than the mean because a mean
 * hides a thin dark rule in a field of white, which is exactly what would print as a line.
 */
async function sampleEdgeRing(path: string, dims: ImageDims, thickness = 8): Promise<EdgePixel[]> {
  const sharp = (await import("sharp")).default;
  const { width: w, height: h } = dims;
  const t = Math.max(1, Math.min(thickness, Math.floor(Math.min(w, h) / 2)));
  const strips = [
    { left: 0, top: 0, width: w, height: t },
    { left: 0, top: h - t, width: w, height: t },
    { left: 0, top: 0, width: t, height: h },
    { left: w - t, top: 0, width: t, height: h },
  ];
  const ring: EdgePixel[] = [];
  for (const strip of strips) {
    const { data, info } = await sharp(path, { limitInputPixels: false })
      .extract(strip)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let worst: EdgePixel | null = null;
    let off = -1;
    for (let i = 0; i + 2 < data.length; i += info.channels) {
      const r = data[i], g = data[i + 1], b = data[i + 2];
      const d = Math.max(255 - r, 255 - g, 255 - b);
      if (d > off) {
        off = d;
        worst = { r, g, b };
      }
    }
    if (worst) ring.push(worst);
  }
  return ring;
}

async function main() {
  const root = resolve(dir!);
  const masters = listMasterFiles(root, (d) => readdirSync(d, { withFileTypes: true }));
  if (masters.length === 0) {
    console.log(`No .png or .jpg masters in ${dir} (subfolders are searched; "." and "_" folders are skipped)`);
    return;
  }
  const existing = new Set((await listAllProducts(client)).filter((p) => p.access?.type !== "ARCHIVED").map((p) => p.name));

  const summary = { created: 0, skipped: 0, failed: 0 };
  for (const master of masters) {
    const file = master.file;
    const title = titleFromFilename(file);
    if (only && title !== only) continue;
    const bytes = new Uint8Array(readFileSync(join(root, master.path)));
    const dims = readImageDims(bytes);
    if (!dims) {
      console.error(`skip   ${master.path}: not a PNG or JPEG`);
      summary.failed++;
      continue;
    }
    // Fourthwall has no landscape wall art, so a landscape master can only ever letterbox.
    const landscape = orientationRefusal(dims);
    if (landscape) {
      console.error(`refuse ${master.path}: ${landscape}`);
      summary.failed++;
      continue;
    }

    // The ratio comes from the pixels, never the file name. A master saved under the wrong tag
    // would otherwise build a product whose sizes do not match its artwork, and that mistake only
    // surfaces on printed paper.
    const actual = detectRatio(dims);
    const tag = ratioTagFromFilename(file);
    const claimed = tag ? scopeFromTag(tag) : null;

    let scope: LadderScope;
    if (claimed === FULL_LADDER) {
      // [all] sells every size from one master, which is only invisible while the ground is white.
      // Shape is deliberately not checked here: letterboxing is the point, and on white it costs
      // nothing. The ground is checked instead, and it is a refusal: a cream master looks perfect
      // on screen and prints a line across the sheet, and artwork cannot be replaced after creation.
      const verdict = whiteGroundVerdict(await sampleEdgeRing(join(root, master.path), dims));
      if (!verdict.ok) {
        console.error(`refuse ${master.path}: named [all] but ${verdict.message}`);
        summary.failed++;
        continue;
      }
      scope = FULL_LADDER;
    } else {
      if (!actual) {
        console.error(`refuse ${title}: ${dims.width}×${dims.height} px is not one of ${RATIO_FAMILIES.map((f) => f.ratio).join(", ")}.`);
        console.error(`       Fourthwall fits art to the sheet rather than cropping, so a shape off the ladder prints with blank paper on two edges.`);
        console.error(`       A white-ground master can carry the whole ladder whatever its shape: name it [all].`);
        summary.failed++;
        continue;
      }
      if (claimed && claimed !== actual) {
        console.error(`refuse ${master.path}: named [${tag}] but the pixels are ${actual} (${dims.width}×${dims.height}).`);
        console.error(`       Rename it or re-export it; the tag is a label, the pixels are the truth.`);
        summary.failed++;
        continue;
      }
      if (!tag && actual !== DEFAULT_RATIO) {
        console.warn(`warn   ${master.path}: no tag in the name but the pixels are ${actual}. Rename it [${ratioTag(actual)}] so the folder reads true.`);
      }
      scope = actual;
    }

    // Resolution is a refusal, not a warning: a soft print is a refund and a bad review, and it
    // cannot be fixed after creation because the Platform API has no endpoint to replace artwork.
    const ladder = sizeNamesFor(scope, "poster");
    const quality = masterQuality(dims, ladder);
    if (!quality.ok) {
      console.error(`refuse ${title} [${ratioTag(scope)}]: ${quality.message}`);
      summary.failed++;
      continue;
    }
    if (quality.message) console.warn(`warn   ${title} [${ratioTag(scope)}]: ${quality.message}`);

    const todo = (["poster", "framed"] as const).filter((f) => !existing.has(productName(title, f, scope)));
    for (const f of (["poster", "framed"] as const).filter((f) => existing.has(productName(title, f, scope)))) {
      console.log(`skip   ${productName(title, f, scope)} (exists)`);
      summary.skipped++;
    }
    if (todo.length === 0) {
      canvasReminder(title);
      continue;
    }

    console.log(
      `${apply ? "create" : "would create"} ${title} [${ratioTag(scope)}] (${dims.width}×${dims.height}): ` +
        `${todo.map((f) => productName(title, f, scope)).join(", ")}` +
        ` | sizes ${ladder.join(", ")}` +
        ` | margins poster $${marginPoster}, framed $${marginFramed} (${frameColors.join("/")})${publish ? " | PUBLISH" : " | hidden"}`
    );
    if (!apply) {
      canvasReminder(title);
      continue;
    }

    try {
      const imageId = await uploadMedia(client, bytes, file, dims);
      for (const finish of todo) {
        try {
          const created = await createDesignProduct(client, {
            finish,
            title,
            ratio: scope,
            imageId,
            marginUsd: finish === "poster" ? marginPoster : marginFramed,
            frameColors,
            publish,
          });
          console.log(`ok     ${productName(title, finish, scope)} -> ${created.productId} (${created.images?.length ?? 0} mockups)`);
          summary.created++;
          existing.add(productName(title, finish, scope));
        } catch (e) {
          const msg = e instanceof PlatformError ? `${e.status} ${e.body}` : String(e);
          console.error(`fail   ${productName(title, finish, scope)}: ${msg}`);
          summary.failed++;
        }
        await sleep(500);
      }
    } catch (e) {
      const msg = e instanceof PlatformError ? `${e.status} ${e.body}` : String(e);
      console.error(`fail   ${title}: upload ${msg}`);
      summary.failed++;
    }
    canvasReminder(title);
  }

  console.log(`\n${summary.created} created, ${summary.skipped} skipped, ${summary.failed} failed${apply ? "" : " (dry run; add --apply to write)"}.`);
  if (apply && summary.created > 0) {
    console.log(
      `\nThe prices are wrong on purpose and need a pass in the dashboard.\n` +
        `Fourthwall takes one profit margin per product, and the ladder in config/commerce.ts is a\n` +
        `price per size, so no margin can start them all correct. This names the exact rows:\n\n` +
        `  npm run shop:prices\n\n` +
        `Then publish the products and run:  npm run shop:sync   and   npm run shop:art -- --apply`
    );
  }
  if (summary.failed > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
