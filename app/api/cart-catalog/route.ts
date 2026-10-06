import { NextResponse } from "next/server";

import { buildCartCatalog } from "@/lib/cart-catalog";
import { getShopPrints } from "@/sanity/lib/client";

// Rebuilt at most every 5 minutes, so a print removed in Studio is flagged within that window.
export const revalidate = 300;

/** The variants we still sell and the prints the cart can suggest (lib/cart-catalog.ts). */
export async function GET() {
  try {
    return NextResponse.json(buildCartCatalog(await getShopPrints()));
  } catch (error) {
    console.error("[CART-CATALOG]", error);
    // The drawer treats a missing catalog as "unknown" and flags nothing.
    return NextResponse.json({ error: "catalog unavailable" }, { status: 503 });
  }
}
