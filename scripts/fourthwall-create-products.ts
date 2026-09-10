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
import {
  createDesignProduct,
  createPlatformClient,
  listMasterFiles,
  dimsWarning,
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
    const warn = dimsWarning(dims);
    if (warn) console.warn(`warn   ${title}: ${warn}`);

    const todo = (["poster", "framed"] as const).filter((f) => !existing.has(productName(title, f)));
    for (const f of (["poster", "framed"] as const).filter((f) => existing.has(productName(title, f)))) {
      console.log(`skip   ${productName(title, f)} (exists)`);
      summary.skipped++;
    }
    if (todo.length === 0) {
      canvasReminder(title);
      continue;
    }

    console.log(
      `${apply ? "create" : "would create"} ${title} (${dims.width}×${dims.height}): ${todo.map((f) => productName(title, f)).join(", ")}` +
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
            imageId,
            marginUsd: finish === "poster" ? marginPoster : marginFramed,
            frameColors,
            publish,
          });
          console.log(`ok     ${productName(title, finish)} -> ${created.productId} (${created.images?.length ?? 0} mockups)`);
          summary.created++;
          existing.add(productName(title, finish));
        } catch (e) {
          const msg = e instanceof PlatformError ? `${e.status} ${e.body}` : String(e);
          console.error(`fail   ${productName(title, finish)}: ${msg}`);
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
    console.log(`Next: check the prices in Fourthwall, then run\n  npm run shop:sync   and   npm run shop:art -- --apply`);
  }
  if (summary.failed > 0) process.exit(2);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
