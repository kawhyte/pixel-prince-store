"use client";

import { ShoppingBag } from "lucide-react";

import { cartCount } from "@/lib/fourthwall-cart";
import { useCart } from "./CartProvider";

/** Bag icon with a count for the nav. Renders nothing when the cart is not configured. */
export default function CartButton({ className = "" }: { className?: string }) {
  const { enabled, cart, setOpen } = useCart();
  if (!enabled) return null;
  const count = cartCount(cart);

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-label={count > 0 ? `Open cart, ${count} item${count === 1 ? "" : "s"}` : "Open cart"}
      className={`relative flex size-11 items-center justify-center rounded-md text-charcoal transition-colors hover:bg-sage-100 ${className}`}
    >
      <ShoppingBag className="size-5" aria-hidden />
      {count > 0 && (
        <span
          data-testid="cart-count"
          className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sage-500 px-1 text-[11px] font-semibold text-white"
        >
          {count}
        </span>
      )}
    </button>
  );
}
