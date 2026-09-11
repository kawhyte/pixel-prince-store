/**
 * Are the shop prices what you meant them to be? (PLAN-50 follow up)
 *
 *   npm run shop:prices              only the prices that disagree
 *   npm run shop:prices -- --all     every price, including the correct ones
 *
 * Fourthwall has no way to change a price through its API and no bulk edit in the dashboard,
 * so a repricing is done by hand. This turns "check a hundred products" into "change these
 * seven rows": it reads every live price, compares it against TARGET_PRICES in
 * config/commerce.ts, and prints a link straight to each product that needs a change.
 *
 * It never changes anything.
 */
import { config } from "dotenv";
import { resolve } from "path";
import { createPlatformClient, PlatformError } from "../lib/fourthwall-platform";
import { pickVariantPerSize, splitProductName, PREFERRED_COLOR } from "../lib/fourthwall-import";
import { getShopSize } from "../config/commerce";
import { comparePrices } from "../lib/shop-doctor";

config({ path: resolve(__dirname, "../.env.local") });

const showAll = process.argv.includes("--all");

const user = process.env.FOURTHWALL_API_USER;
const password = process.env.FOURTHWALL_API_PASSWORD;
if (!user || !password) {
  console.error("Missing FOURTHWALL_API_USER / FOURTHWALL_API_PASSWORD in .env.local. Ask Claude to set this up.");
  process.exit(1);
}
const client = createPlatformClient(user, password);

interface Variant {
  id: string;
  unitPrice?: { value?: number };
  unitCost?: { value?: number };
  attributes?: { size?: { name?: string }; color?: { name?: string } };
}
interface Product {
  id: string;
  name: string;
  access?: { type?: string };
  variants?: Variant[];
}

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const pad = (text: string, width: number) => text + " ".repeat(Math.max(0, width - text.length));

interface Row {
  size: string;
  now: number | null;
  target: number;
  keep: number | null;
}

async function main() {
  const shop = await client.get<{ name?: string; domain?: string }>("/shops/current");
  const adminSlug = process.env.FOURTHWALL_ADMIN_SLUG || (shop.domain ?? "").replace(/-shop$/, "");

  const products: Product[] = [];
  for (let page = 0; page < 50; page++) {
    const res = await client.get<{ results?: Product[] }>(`/products?page=${page}&size=100`);
    const items = res.results ?? [];
    products.push(...items);
    if (items.length < 100) break;
  }
  const live = products.filter((p) => p.access?.type !== "ARCHIVED");

  console.log(`\nChecking prices for ${live.length} product${live.length === 1 ? "" : "s"} in ${shop.name ?? "your shop"}.`);
  console.log(`Target prices come from config/commerce.ts. Nothing here changes anything.\n`);

  let productsNeedingWork = 0;
  let rowsNeedingWork = 0;
  let unchecked = 0;

  for (const product of live) {
    const { finish } = splitProductName(product.name);
    const bySize = pickVariantPerSize(product.variants ?? [], PREFERRED_COLOR);

    // The comparison itself lives in lib/shop-doctor.ts, so this report and `npm run shop:doctor`
    // can never disagree about which prices are wrong. What is added here is the printer's cost,
    // which only this report shows.
    const live = new Map<string, number | null>();
    for (const [sizeId, variant] of bySize) {
      live.set(sizeId, typeof variant.unitPrice?.value === "number" ? Math.round(variant.unitPrice.value * 100) : null);
    }
    const compared = comparePrices(finish, live);
    unchecked += compared.unchecked.length;

    const costOf = (sizeId: string) => {
      const c = bySize.get(sizeId)?.unitCost?.value;
      return typeof c === "number" ? Math.round(c * 100) : null;
    };
    const rows: Row[] = compared.rows.map((r) => {
      const cost = r.now === null ? null : costOf(r.sizeId);
      return { size: r.sizeId, now: r.now, target: r.target, keep: cost === null ? null : r.target - cost };
    });
    const wrong = rows.filter((r) => r.now !== r.target);
    if (wrong.length === 0 && !showAll) continue;
    if (wrong.length > 0) {
      productsNeedingWork++;
      rowsNeedingWork += wrong.length;
    }

    console.log(product.name);
    console.log(`  https://admin.fourthwall.com/store/${adminSlug}/products/all/${product.id}/`);
    for (const row of showAll ? rows : wrong) {
      const label = pad(getShopSize(row.size)?.label ?? row.size, 8);
      if (row.now === null) {
        console.log(`  ${label} not sold at this size. Add it, or remove it from the target list.`);
        continue;
      }
      if (row.now === row.target) {
        console.log(`  ${label} ${money(row.now)}  correct`);
        continue;
      }
      const diff = row.target - row.now;
      const move = diff > 0 ? `raise it by ${money(diff)}` : `lower it by ${money(-diff)}`;
      const keep = row.keep === null ? "" : `   you would keep ${money(row.keep)}`;
      console.log(`  ${label} now ${pad(money(row.now), 8)} should be ${pad(money(row.target), 8)} ${pad(move, 22)}${keep}`);
    }
    console.log("");
  }

  console.log("Summary");
  if (rowsNeedingWork === 0) {
    console.log(`  Every price matches your list. Nothing to do.`);
  } else {
    console.log(`  ${productsNeedingWork} of ${live.length} products need a change, ${rowsNeedingWork} price${rowsNeedingWork === 1 ? "" : "s"} in total.`);
    console.log(`  Open each link above, edit the Selling price column and save.`);
    console.log(`  Fourthwall takes a minute or two to publish a price change, so wait, then run:  npm run shop:sync`);
  }
  if (unchecked > 0) {
    console.log(`  ${unchecked} size${unchecked === 1 ? " is" : "s are"} sold in Fourthwall but not in your target list, so they were not checked.`);
  }
  console.log(`  "You would keep" is the target price minus what the printer charges, before payment fees and free shipping.\n`);
}

main().catch((e) => {
  console.error(`\nCould not read your shop: ${e instanceof PlatformError ? `${e.status} ${e.body}` : String(e)}\n`);
  process.exit(1);
});
