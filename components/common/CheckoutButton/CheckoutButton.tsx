"use client";

import { useState } from "react";
import { ArrowUpRight, ShoppingBag } from "lucide-react";

import type { FreeArt } from "@/sanity/lib/client";
import { getActiveOffer, orderedSizes, resolveCheckout, formatPrice } from "@/lib/commerce";
import { getShopSize } from "@/config/commerce";
import { SHOP_TRUST_LINE } from "@/config/shop-copy";
import { trackCheckoutOpened } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface CheckoutButtonProps {
  art: FreeArt;
  campaign: string;
}

/**
 * Size picker + Buy button. Reads offers only through lib/commerce.ts.
 * Fourthwall: same-tab hand-off to the hosted checkout with the size in the cart.
 * Etsy (legacy): outbound link, no size picker. Stripe: "Coming soon" (Phase 2).
 */
export default function CheckoutButton({ art, campaign }: CheckoutButtonProps) {
  const offer = getActiveOffer(art);
  const sizes = offer ? orderedSizes(offer) : [];
  const defaultSize = sizes.find((s) => s.popular)?.sizeId ?? sizes[0]?.sizeId ?? null;
  const [sizeId, setSizeId] = useState<string | null>(defaultSize);

  if (!offer) return null;

  const target = resolveCheckout(offer, sizeId, campaign);
  const selected = sizes.find((s) => s.sizeId === sizeId);

  return (
    <div className="space-y-4">
      {sizes.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-semibold text-charcoal">Size</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {sizes.map((s) => {
              const meta = getShopSize(s.sizeId);
              const active = s.sizeId === sizeId;
              return (
                <label
                  key={s.sizeId}
                  className={cn(
                    "flex h-12 cursor-pointer items-center justify-between gap-2 rounded-md border bg-card px-3 text-sm transition-colors",
                    active ? "border-charcoal ring-1 ring-charcoal" : "border-border hover:border-charcoal",
                  )}
                >
                  <input
                    type="radio"
                    name="size"
                    value={s.sizeId}
                    checked={active}
                    onChange={() => setSizeId(s.sizeId)}
                    className="sr-only"
                  />
                  <span className="font-medium text-charcoal">{meta?.label ?? s.sizeId}</span>
                  <span className="flex items-center gap-1.5">
                    {s.popular && (
                      <span className="rounded-md bg-sage-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sage-500">
                        Popular
                      </span>
                    )}
                    <span className="text-muted-foreground">{formatPrice(s.priceCents)}</span>
                  </span>
                </label>
              );
            })}
          </div>
          {selected && (
            <p className="mt-2 text-xs text-muted-foreground">{getShopSize(selected.sizeId)?.cm}</p>
          )}
        </fieldset>
      )}

      {target ? (
        <a
          href={target.href}
          target={target.external ? "_blank" : "_self"}
          rel={target.external ? "noopener" : undefined}
          onClick={() => trackCheckoutOpened(art.id, sizeId ?? "", target.provider)}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-sage-500 px-6 text-base font-semibold text-white transition-colors hover:bg-sage-400"
        >
          {target.external ? <ArrowUpRight className="size-5" /> : <ShoppingBag className="size-5" />}
          {target.label}
          {selected && !target.external && (
            <span className="font-normal opacity-90">· {formatPrice(selected.priceCents)}</span>
          )}
        </a>
      ) : (
        <button
          type="button"
          disabled
          className="inline-flex h-12 w-full items-center justify-center rounded-md bg-sage-500 px-6 text-base font-semibold text-white opacity-50"
        >
          Coming soon
        </button>
      )}
      {target && !target.external && (
        <p className="text-center text-xs text-muted-foreground">{SHOP_TRUST_LINE}</p>
      )}
    </div>
  );
}
