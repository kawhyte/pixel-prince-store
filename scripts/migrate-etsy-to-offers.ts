/**
 * Wrap each artwork's legacy etsyListingUrl in a `printOffer` (provider: etsy).
 * Skips artworks that already have an etsy offer. Dry run unless --apply.
 *
 * Run: npx tsx scripts/migrate-etsy-to-offers.ts          (preview)
 *      npx tsx scripts/migrate-etsy-to-offers.ts --apply  (write)
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { resolve } from "path";
import { randomUUID } from "crypto";

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

interface Row {
  _id: string;
  title: string;
  etsyListingUrl?: string;
  offers?: { provider?: string }[];
}

const apply = process.argv.includes("--apply");

async function main() {
  const rows = await client.fetch<Row[]>(
    `*[_type == "product" && defined(etsyListingUrl)]{ _id, title, etsyListingUrl, offers }`
  );
  let planned = 0;
  for (const row of rows) {
    if ((row.offers ?? []).some((o) => o.provider === "etsy")) {
      console.log(`skip   ${row._id}  (already has an etsy offer)`);
      continue;
    }
    planned++;
    console.log(`${apply ? "patch " : "would "} ${row._id}  ${row.title}  -> ${row.etsyListingUrl}`);
    if (!apply) continue;
    await client
      .patch(row._id)
      .setIfMissing({ offers: [] })
      .append("offers", [
        {
          _type: "printOffer",
          _key: randomUUID().slice(0, 12),
          provider: "etsy",
          active: true,
          checkoutUrl: row.etsyListingUrl,
        },
      ])
      .commit();
  }
  console.log(
    `\n${planned} document(s) ${apply ? "patched" : "would be patched"}. ${apply ? "" : "Re-run with --apply to write."}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
