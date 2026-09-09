/**
 * One-off backfill (PLAN-35b): set `listing: "free"` on every artwork that has no listing yet.
 * Existing documents predate the free/shop switch and are all free prints.
 * Dry run unless --apply.
 *
 * Run: npx tsx scripts/backfill-listing-free.ts          (preview)
 *      npx tsx scripts/backfill-listing-free.ts --apply  (write)
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const token = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
if (!token) throw new Error("SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) missing in .env.local");

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  apiVersion: "2025-11-27",
  token,
  useCdn: false,
  perspective: "raw", // drafts AND published
});

const apply = process.argv.includes("--apply");

async function main() {
  const rows = await client.fetch<{ _id: string; title: string }[]>(
    `*[_type == "product" && !defined(listing)]{ _id, title }`
  );
  for (const row of rows) {
    console.log(`${apply ? "patch " : "would "} ${row._id}  ${row.title}  -> listing: free`);
    if (apply) await client.patch(row._id).set({ listing: "free" }).commit();
  }
  console.log(
    `\n${rows.length} document(s) ${apply ? "patched" : "would be patched"}. ${apply ? "" : "Re-run with --apply to write."}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
