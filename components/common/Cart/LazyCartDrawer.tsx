"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

import { useCart } from "./CartProvider";

// The drawer brings Radix Dialog and its scroll lock (~25 KB). Most visitors never open it.
const CartDrawer = dynamic(() => import("./CartDrawer"), { ssr: false });

/**
 * Loads the drawer the first time the cart opens, or as soon as the bag holds something, since
 * that visitor is likely to open it. Once loaded it stays mounted so it can animate closed.
 */
export default function LazyCartDrawer() {
  const { enabled, cart, open } = useCart();
  const [wanted, setWanted] = useState(false);
  const shouldLoad = enabled && (open || (cart?.items.length ?? 0) > 0);
  if (shouldLoad && !wanted) setWanted(true);
  return wanted ? <CartDrawer /> : null;
}
