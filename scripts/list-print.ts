/**
 * One print folder -> a finished Studio draft and a short price to-do list (`npm run shop:list`).
 *
 *   npm run shop:list -- "~/Pixel Prince/Bronx Neighborhood Map"             products stay hidden
 *   npm run shop:list -- "~/Pixel Prince/Bronx Neighborhood Map" --publish   make them public too
 *
 * The folder:
 *   masters/      Title (Version).png, Title (Version) [3x4].png ...   (only this print's masters)
 *   photos/       card.*  room-1.*  room-2.* ...  main-<finish>.*  main-<Version>-<finish>.*  (optional)
 *   listing.json  copy, tags, category, rooms, defaults (optional; see lib/listing-spec.ts)
 *
 * Runs the existing scripts in order: create the Fourthwall products (margins tuned, Black frame
 * only), publish them, import the draft, flat art, photos, copy, then the doctor and the price
 * rows still to fix. Every step is safe to re-run: existing products are skipped, and room photos
 * are only added to a print that has none. The full output goes to <folder>/shop-list.log; the
 * screen gets a short summary, so whoever runs it reads twenty lines, not two hundred.
 *
 * Nothing is published in Studio. That stays a person's step.
 */
import { createClient } from "@sanity/client";
import { spawnSync } from "child_process";
import { config } from "dotenv";
import { appendFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from "fs";
import { join, resolve } from "path";
import { splitProductName, splitVersion } from "../lib/fourthwall-import";
import { createPlatformClient, listAllProducts, listMasterFiles, setProductAccess, titleFromFilename } from "../lib/fourthwall-platform";
import { validateListingSpec } from "../lib/listing-spec";

const repo = resolve(__dirname, "..");
config({ path: join(repo, ".env.local") });

const args = process.argv.slice(2);
const publish = args.includes("--publish");
const folderArg = args.find((a) => !a.startsWith("--"));
if (!folderArg) {
  console.error('Usage: npm run shop:list -- "<print folder>" [--publish]');
  process.exit(1);
}
const folder = resolve(folderArg.replace(/^~/, process.env.HOME ?? "~"));
const mastersDir = join(folder, "masters");
const photosDir = join(folder, "photos");
const specFile = join(folder, "listing.json");
const logFile = join(folder, "shop-list.log");

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-11-27",
  token: process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN,
  useCdn: false,
  perspective: "raw",
});

const ANSI = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");
const NOTEWORTHY = /^\s*(warn|error|refuse|fail|skip\s+\S.*:)/i;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const summary: string[] = [];

/** Run one of the repo's scripts, log all of it, and echo only what needs a person. */
function run(label: string, script: string, scriptArgs: string[]): { ok: boolean; out: string } {
  appendFileSync(logFile, `\n=== ${label}: ${script} ${scriptArgs.join(" ")}\n`);
  const res = spawnSync("npx", ["tsx", join("scripts", script), ...scriptArgs], { cwd: repo, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`.replace(ANSI, "");
  appendFileSync(logFile, out);
  const ok = res.status === 0;
  const notes = out.split("\n").filter((l) => NOTEWORTHY.test(l) && !/dotenv/.test(l));
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`);
  for (const l of notes.slice(0, 8)) console.log(`     ${l.trim()}`);
  if (notes.length > 8) console.log(`     ... ${notes.length - 8} more in shop-list.log`);
  return { ok, out };
}

function stop(message: string): never {
  console.error(`\n${message}\nFull output: ${logFile}`);
  process.exit(1);
}

async function main() {
  if (!existsSync(mastersDir)) stop(`No masters/ folder in ${folder}.`);
  writeFileSync(logFile, `shop:list ${new Date().toISOString()}\n`);

  // One print per folder: every master must share one title once version and tag come off.
  const masters = listMasterFiles(mastersDir, (d) => readdirSync(d, { withFileTypes: true }));
  const titles = [...new Set(masters.map((m) => splitVersion(titleFromFilename(m.file)).title))];
  if (titles.length !== 1) stop(`masters/ must hold one print's files; found titles: ${titles.join(", ") || "none"}.`);
  const title = titles[0];

  // Check the copy before anything is created, so a bad description never strands half a listing.
  const hasSpec = existsSync(specFile);
  if (hasSpec) {
    const { spec, errors, warnings } = validateListingSpec(JSON.parse(readFileSync(specFile, "utf8")));
    for (const w of warnings) console.log(`warn ${w}`);
    if (!spec) stop(`listing.json has ${errors.length} problem(s):\n  ${errors.join("\n  ")}`);
    if (spec.title !== title) stop(`listing.json title "${spec.title}" must match the masters' title "${title}".`);
  }
  console.log(`${title}  (${masters.length} master${masters.length === 1 ? "" : "s"})\n`);

  // 1. Fourthwall products. Black frame only: it is the one the site sells.
  const create = run("Fourthwall products", "fourthwall-create-products.ts", ["--dir", mastersDir, "--frames", "Black", "--apply", ...(publish ? ["--publish"] : [])]);
  const counts = create.out.match(/(\d+) created, (\d+) skipped, (\d+) failed/);
  if (counts) summary.push(`Fourthwall   ${counts[1]} created, ${counts[2]} already there, ${counts[3]} failed`);
  if (!create.ok) stop("Product creation failed; fix what it says above and run this again (finished products are skipped).");

  // Products made hidden on an earlier run go public now, when asked.
  if (publish) {
    const fw = createPlatformClient(process.env.FOURTHWALL_API_USER ?? "", process.env.FOURTHWALL_API_PASSWORD ?? "");
    const hidden = (await listAllProducts(fw)).filter((p) => splitProductName(p.name).title === title && p.access?.type === "HIDDEN");
    for (const p of hidden) await setProductAccess(fw, p.id, "PUBLIC");
    if (hidden.length) console.log(`ok   published ${hidden.length} hidden product(s)`);
  } else {
    const fw = createPlatformClient(process.env.FOURTHWALL_API_USER ?? "", process.env.FOURTHWALL_API_PASSWORD ?? "");
    const mine = (await listAllProducts(fw)).filter((p) => splitProductName(p.name).title === title && p.access?.type !== "ARCHIVED");
    if (mine.some((p) => p.access?.type === "HIDDEN")) {
      summary.push("Fourthwall   products are hidden, so Studio cannot import them yet");
      console.log(`\n${summary.join("\n")}\n\nNext: run again with --publish when Kenny says the products can go public.`);
      return;
    }
  }

  // 2. Studio draft. Fourthwall's storefront publishes a minute or two late, so wait and retry.
  const findDoc = () =>
    sanity.fetch<{ _id: string; galleryCount: number } | null>(
      `*[_type == "product" && listing == "shop" && title == $title] | order(_id desc)[0]{ _id, "galleryCount": count(galleryImages) }`,
      { title },
    );
  let doc = await findDoc();
  for (let attempt = 1; !doc && attempt <= 5; attempt++) {
    if (attempt > 1) {
      console.log(`...  waiting a minute for Fourthwall to publish (try ${attempt} of 5)`);
      await sleep(60_000);
    }
    run("Studio import", "import-fourthwall-products.ts", ["--apply"]);
    doc = await findDoc();
  }
  if (!doc) stop(`"${title}" never reached Studio. Check the products are public in Fourthwall, wait a few minutes, and run this again.`);
  summary.push(`Studio       ${doc._id}`);

  // 3. Flat artwork on each offer.
  run("Flat artwork", "upload-flat-art.ts", ["--dir", mastersDir, "--apply"]);

  // 4. Photos.
  if (existsSync(photosDir)) {
    const files = readdirSync(photosDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const card = files.find((f) => /^card\./i.test(f));
    const rooms = files.filter((f) => /^room/i.test(f));
    const mains = files.filter((f) => /^main-/i.test(f));
    if (card) run("Card image", "attach-photo.ts", ["--file", join(photosDir, card), "--title", title, "--card", "--apply"]);
    if (rooms.length && doc.galleryCount > 0) {
      console.log(`skip room photos: the print already has ${doc.galleryCount}. Change them in Studio.`);
    } else {
      for (const f of rooms) run(`Room photo ${f}`, "attach-photo.ts", ["--file", join(photosDir, f), "--title", title, "--room", "--apply"]);
    }
    for (const f of mains) {
      const parts = f.replace(/\.[^.]+$/, "").split("-").slice(1);
      const finish = parts.pop() ?? "unframed";
      const version = parts.join("-");
      run(`Main photo ${f}`, "attach-photo.ts", ["--file", join(photosDir, f), "--title", title, "--finish", finish, ...(version ? ["--version", version] : []), "--apply"]);
    }
    summary.push(`Photos       card ${card ? "yes" : "no"}, room ${rooms.length}, main ${mains.length}`);
  }

  // 5. Copy.
  if (hasSpec) {
    const copy = run("Listing copy", "apply-listing.ts", ["--file", specFile, "--apply"]);
    summary.push(`Copy         ${copy.ok ? "applied to the draft" : "FAILED, see log"}`);
  } else {
    summary.push("Copy         no listing.json, so the import's starter copy is in place");
  }

  // 6. What is left.
  const doctor = run("Doctor", "shop-doctor.ts", ["--only", title]);
  const prices = run("Prices", "check-prices.ts", ["--only", title]);

  console.log(`\n${summary.join("\n")}`);
  const doctorLines = doctor.out.split("\n").filter((l) => /^\s+[x!] |\s(ready|not ready)\b/.test(l)).slice(0, 12);
  if (doctorLines.length) console.log(`\nDoctor\n${doctorLines.join("\n")}`);
  const priceBlock = prices.out.split("\n").filter((l) => /https:\/\/admin\.fourthwall|should be|^\S.*\S$/.test(l) && !/dotenv|Checking prices|Target prices|Summary|you would keep" is/.test(l));
  const wrong = priceBlock.filter((l) => /should be/.test(l)).length;
  if (wrong === 0) console.log("\nPrices       all correct, nothing to fix");
  else console.log(`\nPrices to fix (${wrong}) - open each link, edit Selling price, save:\n${priceBlock.join("\n")}`);
  console.log(
    `\nNext: ${wrong ? "fix those prices, wait 2 minutes, run  npm run shop:sync  (or Actions > Shop sync). Then " : ""}` +
      `review the draft in Studio and Publish.\nFull output: ${logFile}`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
