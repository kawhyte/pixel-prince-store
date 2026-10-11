/**
 * Put a Stripe offer on one print so the direct-to-Printful path can be clicked (trial, 2026-10-11).
 *
 *   npx tsx scripts/stripe-trial-offer.ts                      what it would do
 *   npx tsx scripts/stripe-trial-offer.ts --apply              add it
 *   npx tsx scripts/stripe-trial-offer.ts --apply --remove     take it back off
 *   options: --slug brooklyn-neighborhood-map  --version Earth  --finish unframed
 *
 * The offer mirrors the print's existing Fourthwall offer - same artwork, same photo, same prices
 * off the ladder - and differs in one way that matters: providerVariantId holds the Printful
 * catalog variant rather than the Fourthwall one, because Printful is who would be printing it.
 *
 * It changes nothing on the live site on its own. Fourthwall outranks Stripe, so the page keeps
 * using Fourthwall until NEXT_PUBLIC_COMMERCE_PROVIDER=stripe is set in .env.local.
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { resolve } from "path";
import { SHOP_SIZE_LADDER, TARGET_PRICES, type FinishId } from "../config/commerce";

config({ path: resolve(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string, d?: string) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};
const slug = opt("--slug", "brooklyn-neighborhood-map")!;
const version = opt("--version", "Earth")!;
const finish = (opt("--finish", "unframed") ?? "unframed") as FinishId;
const apply = flag("--apply");
const remove = flag("--remove");

/** Printful catalog variants, Enhanced Matte Paper Poster (in), read from their API 2026-10-11. */
const PRINTFUL_POSTER: Record<string, number> = {
  "8x10": 4463,
  "11x14": 14125,
  "16x20": 3877,
  "18x24": 1,
  "24x36": 2,
};

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION!,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

interface OfferRow {
  _key: string;
  provider: string;
  finish?: string;
  version?: string;
  art?: unknown;
  mockup?: unknown;
}

async function main() {
  if (finish !== "unframed") throw new Error("the trial covers the unframed poster only; framed is a different Printful product");

  const doc = await sanity.fetch<{ _id: string; title: string; offers?: OfferRow[] } | null>(
    `*[_type=="product" && slug.current==$slug && !(_id in path("drafts.**"))][0]{_id, title, offers}`,
    { slug } as Record<string, string>,
  );
  if (!doc) throw new Error(`no published shop print called ${slug}`);

  const offers = doc.offers ?? [];
  const existing = offers.find((o) => o.provider === "stripe" && (o.version ?? "") === version && (o.finish ?? "unframed") === finish);

  if (remove) {
    if (!existing) return console.log(`${doc.title}: no Stripe offer to remove`);
    console.log(`${apply ? "remove" : "would remove"} the Stripe offer from ${doc.title} (${version}, ${finish})`);
    if (!apply) return;
    await sanity.patch(doc._id).unset([`offers[_key=="${existing._key}"]`]).commit();
    return console.log("ok     removed");
  }
  if (existing) return console.log(`${doc.title} already has a Stripe offer for ${version} ${finish}. Use --remove first.`);

  // Mirror the Fourthwall offer so the page looks identical; only the variant ids differ.
  const source = offers.find((o) => o.provider === "fourthwall" && (o.version ?? "") === version && (o.finish ?? "unframed") === finish);
  if (!source) throw new Error(`${doc.title} has no Fourthwall ${version} ${finish} offer to mirror`);

  const sizes = SHOP_SIZE_LADDER.flatMap((s) => {
    const variant = PRINTFUL_POSTER[s.id];
    const price = TARGET_PRICES[finish]?.[s.id];
    if (!variant || !price) return [];
    return [{ _type: "shopSize", _key: `stripe-${s.id}`, sizeId: s.id, priceCents: price, providerVariantId: String(variant) }];
  });

  const offer = {
    _type: "printOffer",
    _key: `stripe-${version.toLowerCase()}-${finish}`,
    provider: "stripe",
    finish,
    version,
    active: true,
    // the artwork to print and the photo to show, taken from the offer that already has them
    ...(source.art ? { art: source.art } : {}),
    ...(source.mockup ? { mockup: source.mockup } : {}),
    sizes,
  };

  console.log(`${apply ? "add" : "would add"} a Stripe offer to ${doc.title} (${version}, ${finish})`);
  for (const s of sizes) console.log(`   ${s.sizeId.padEnd(6)} $${(s.priceCents / 100).toFixed(2).padStart(7)}  printful variant ${s.providerVariantId}`);
  if (!source.art) console.warn(`warn   the source offer has no flat art, so there is nothing for Printful to print`);
  if (!apply) return console.log("\ndry run; pass --apply");

  await sanity.patch(doc._id).setIfMissing({ offers: [] }).append("offers", [offer]).commit();
  console.log("\nok     added. The page still uses Fourthwall until you set NEXT_PUBLIC_COMMERCE_PROVIDER=stripe in .env.local.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
