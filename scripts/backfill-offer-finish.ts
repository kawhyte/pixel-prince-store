/**
 * One-off backfill (PLAN-46): set `finish: "unframed"` on every printOffer that has no finish yet.
 * Dry run unless --apply. Patches drafts and published documents.
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
  perspective: "raw",
});

const apply = process.argv.includes("--apply");

async function main() {
  const rows = await client.fetch<{ _id: string; title: string; keys: string[] }[]>(
    `*[_type == "product" && count(offers[!defined(finish)]) > 0]{ _id, title, "keys": offers[!defined(finish)]._key }`
  );
  for (const row of rows) {
    console.log(`${apply ? "patch " : "would "} ${row._id}  ${row.title}  -> ${row.keys.length} offer(s) finish: unframed`);
    if (!apply) continue;
    let p = client.patch(row._id);
    for (const key of row.keys) p = p.set({ [`offers[_key=="${key}"].finish`]: "unframed" });
    await p.commit();
  }
  console.log(`\n${rows.length} document(s) ${apply ? "patched" : "would be patched"}.${apply ? "" : " Re-run with --apply to write."}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
