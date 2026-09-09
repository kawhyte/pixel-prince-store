"use client";

import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";

import { formatPrice } from "@/lib/commerce";
import { buildCartCheckoutUrl, cartCount, cartTotalCents } from "@/lib/fourthwall-cart";
import { trackCartCheckout } from "@/lib/analytics";
import { useCart } from "./CartProvider";

/** Right-side cart drawer (PLAN-45). Fourthwall prices, our chrome. */
export default function CartDrawer() {
  const { enabled, cart, busy, open, setOpen, setQuantity, remove } = useCart();
  if (!enabled) return null;

  const items = cart?.items ?? [];
  const count = cartCount(cart);
  const checkoutHref = cart?.id ? buildCartCheckoutUrl(cart.id, "cart") : null;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col bg-cream shadow-card-hover outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
        >
          <div className="flex h-16 items-center justify-between border-b border-border px-5">
            <Dialog.Title className="text-lg font-semibold text-charcoal">
              Your cart{count > 0 ? ` (${count})` : ""}
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close cart"
              className="flex size-11 items-center justify-center rounded-md text-charcoal transition-colors hover:bg-sage-100"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>

          {items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
              <ShoppingBag className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-base text-charcoal">Your cart is empty.</p>
              <p className="text-sm text-soft-charcoal">Prints ship free inside the US. Two look better than one.</p>
              <Dialog.Close className="mt-2 inline-flex h-12 items-center rounded-md border border-charcoal px-6 text-sm font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-cream">
                Keep browsing
              </Dialog.Close>
            </div>
          ) : (
            <>
              <ul className="flex-1 divide-y divide-border overflow-y-auto px-5">
                {items.map((item) => {
                  const v = item.variant;
                  const unit = typeof v.unitPrice?.value === "number" ? Math.round(v.unitPrice.value * 100) : null;
                  const img = v.images?.[0]?.url;
                  return (
                    <li key={v.id} className="flex gap-4 py-4">
                      <div className="relative h-24 w-[76px] shrink-0 overflow-hidden rounded-md bg-muted">
                        {img && <Image src={img} alt={v.product?.name ?? v.name ?? "Print"} fill className="object-cover" sizes="76px" unoptimized />}
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <p className="truncate text-sm font-semibold text-charcoal">{v.product?.name ?? v.name}</p>
                        {v.attributes?.size?.name && <p className="text-xs text-muted-foreground">{v.attributes.size.name}</p>}
                        {unit !== null && <p className="text-sm text-charcoal">{formatPrice(unit)}</p>}
                        <div className="mt-auto flex items-center justify-between">
                          <div className="inline-flex items-center rounded-md border border-border bg-card">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setQuantity(v.id, item.quantity - 1)}
                              aria-label="Decrease quantity"
                              className="flex size-11 items-center justify-center text-charcoal disabled:opacity-50"
                            >
                              <Minus className="size-4" aria-hidden />
                            </button>
                            <span className="min-w-6 text-center text-sm font-medium text-charcoal" aria-live="polite">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setQuantity(v.id, item.quantity + 1)}
                              aria-label="Increase quantity"
                              className="flex size-11 items-center justify-center text-charcoal disabled:opacity-50"
                            >
                              <Plus className="size-4" aria-hidden />
                            </button>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            onClick={() => remove(v.id)}
                            className="text-xs text-muted-foreground underline hover:text-charcoal disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="border-t border-border px-5 pb-6 pt-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-soft-charcoal">Subtotal</span>
                  <span className="text-lg font-semibold text-charcoal">{formatPrice(cartTotalCents(cart))}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Free US shipping. Tax calculated at checkout.</p>
                {checkoutHref && (
                  <a
                    href={checkoutHref}
                    onClick={() => trackCartCheckout(items.map((i) => `${i.variant.id}:${i.quantity}`).join(","))}
                    className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-md bg-charcoal text-base font-semibold text-white transition-colors hover:bg-soft-charcoal"
                  >
                    Checkout · {formatPrice(cartTotalCents(cart))}
                  </a>
                )}
                <Dialog.Close className="mt-2 inline-flex h-11 w-full items-center justify-center text-sm font-medium text-sage-500 hover:text-sage-400">
                  Continue shopping
                </Dialog.Close>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
