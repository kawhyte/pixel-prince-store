/**
 * List Fourthwall products with their product id and one variant id per size,
 * formatted for pasting into Studio (Artwork > tab 4 Shop > Print offers).
 *
 * Needs FOURTHWALL_STOREFRONT_TOKEN in .env.local (Fourthwall admin > Settings >
 * For Developers > Storefront API). Read-only public storefront token.
 *
 * Run: npx tsx scripts/fourthwall-ids.ts
 *      npx tsx scripts/fourthwall-ids.ts --json   (raw API output, for debugging field names)
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(__dirname, "../.env.local") });

const token = process.env.FOURTHWALL_STOREFRONT_TOKEN;
if (!token) throw new Error("FOURTHWALL_STOREFRONT_TOKEN missing in .env.local");

const BASE = "https://storefront-api.fourthwall.com/v1";

interface Variant {
  id: string;
  name?: string;
  unitPrice?: { value?: number; currency?: string };
  attributes?: { size?: { name?: string } | string; [k: string]: unknown };
  [k: string]: unknown;
}
interface Product {
  id: string;
  name: string;
  slug?: string;
  variants?: Variant[];
  [k: string]: unknown;
}

function variantSize(v: Variant): string {
  const size = v.attributes?.size;
  if (typeof size === "string") return size;
  if (size && typeof size === "object" && "name" in size && typeof size.name === "string") return size.name;
  return v.name ?? "?";
}

/** '8" x 10"' or '8x10' -> '8x10' (matches config/commerce.ts SHOP_SIZE_LADDER ids). */
function sizeId(label: string): string {
  const m = label.match(/(\d+)\D+(\d+)/);
  return m ? `${m[1]}x${m[2]}` : label;
}

async function fetchJson<T>(path: string): Promise<T> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}storefront_token=${encodeURIComponent(token!)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} for ${path}`);
  return (await res.json()) as T;
}

async function main() {
  // Products live under the built-in "all" collection; /products alone is 404.
  const raw = await fetchJson<{ results?: Product[]; paging?: { hasNextPage?: boolean } }>(
    "/collections/all/products?pageSize=100"
  );
  const products = raw.results ?? [];
  if (raw.paging?.hasNextPage) console.warn("More than one page of products; only the first page is shown.");
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(raw, null, 2));
    return;
  }
  if (products.length === 0) {
    console.log("No public products found.");
    return;
  }
  for (const p of products) {
    console.log(`\n${p.name}`);
    console.log(`  product id : ${p.id}`);
    if (p.slug) console.log(`  slug       : ${p.slug}`);
    for (const v of p.variants ?? []) {
      const label = variantSize(v);
      const cents = typeof v.unitPrice?.value === "number" ? Math.round(v.unitPrice.value * 100) : null;
      console.log(
        `  ${sizeId(label).padEnd(6)} ${label.padEnd(12)} priceCents=${String(cents ?? "?").padEnd(6)} variant=${v.id}`
      );
    }
  }
  console.log("\nPaste into Studio: product id above, then one size row per variant (sizeId, priceCents, variant id).");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
