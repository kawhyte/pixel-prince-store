"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ShoppingBag } from "lucide-react";

import type { FreeArt } from "@/sanity/lib/client";
import { getActiveOffer, orderedSizes, resolveCheckout, formatPrice, fromPriceCents, popularSizeId } from "@/lib/commerce";
import { getShopSize, inchesLabel } from "@/config/commerce";
import { SHOP_TRUST_LINE } from "@/config/shop-copy";
import { trackCheckoutOpened } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface CheckoutButtonProps {
  art: FreeArt;
  campaign: string;
  /** sage = the site accent; ink = paid CTA on shop pages (Direction B), keeps sage for the free CTA */
  variant?: "sage" | "ink";
  /** grid = label left, price right (2/3 columns); columns = label over price, 3 columns on phones, 5 on md+ */
  sizeLayout?: "grid" | "columns";
  /** selected price + size line above the picker */
  showPrice?: boolean;
  /** repeat price + Buy in a fixed bar at the bottom on < lg */
  stickyBar?: boolean;
  /** anchor to a size guide on the page */
  sizeGuideHref?: string;
}

/**
 * Size picker + Buy button. Reads offers only through lib/commerce.ts.
 * Fourthwall: same-tab hand-off to the hosted checkout with the size in the cart.
 * Etsy (legacy): outbound link, no size picker. Stripe: "Coming soon" (Phase 2).
 */
export default function CheckoutButton({
  art,
  campaign,
  variant = "sage",
  sizeLayout = "grid",
  showPrice = false,
  stickyBar = false,
  sizeGuideHref,
}: CheckoutButtonProps) {
  const offer = getActiveOffer(art);
  const sizes = offer ? orderedSizes(offer) : [];
  const popular = popularSizeId(offer);
  const [sizeId, setSizeId] = useState<string | null>(popular);

  if (!offer) return null;

  const target = resolveCheckout(offer, sizeId, campaign);
  const selected = sizes.find((s) => s.sizeId === sizeId);
  const selectedMeta = selected ? getShopSize(selected.sizeId) : undefined;
  const from = fromPriceCents(offer);
  const priceText = selected ? formatPrice(selected.priceCents) : from !== null ? `From ${formatPrice(from)}` : "";

  const buttonClass = cn(
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-6 text-base font-semibold text-white transition-colors",
    variant === "ink" ? "bg-charcoal hover:bg-soft-charcoal" : "bg-sage-500 hover:bg-sage-400",
  );

  const buyControl = (compact = false) =>
    target ? (
      <a
        href={target.href}
        target={target.external ? "_blank" : "_self"}
        rel={target.external ? "noopener" : undefined}
        onClick={() => trackCheckoutOpened(art.id, sizeId ?? "", target.provider)}
        className={buttonClass}
      >
        {target.external ? <ArrowUpRight className="size-5" /> : <ShoppingBag className="size-5" />}
        {target.label}
        {selected && !target.external && !compact && (
          <span className="font-normal opacity-90">· {formatPrice(selected.priceCents)}</span>
        )}
      </a>
    ) : (
      <button type="button" disabled className={cn(buttonClass, "opacity-50")}>
        Coming soon
      </button>
    );

  return (
    <div className="space-y-4">
      {showPrice && priceText && (
        <div className="flex items-baseline gap-3">
          <span className="text-[28px] font-semibold text-charcoal">{priceText}</span>
          {selectedMeta && (
            <span className="text-sm text-muted-foreground">{inchesLabel(selectedMeta.id)} · free US shipping</span>
          )}
        </div>
      )}

      {sizes.length > 0 && (
        <fieldset>
          <div className="mb-2 flex items-center justify-between">
            <legend className="text-sm font-semibold text-charcoal">Size</legend>
            {sizeGuideHref ? (
              <Link href={sizeGuideHref} className="text-xs text-sage-500 underline hover:text-sage-400">
                Size guide
              </Link>
            ) : (
              selectedMeta && <span className="text-xs text-muted-foreground">{selectedMeta.cm}</span>
            )}
          </div>
          <div
            className={cn(
              "grid gap-2",
              sizeLayout === "columns" ? "grid-cols-3 md:grid-cols-5" : "grid-cols-2 sm:grid-cols-3",
            )}
          >
            {sizes.map((s) => {
              const active = s.sizeId === sizeId;
              const isPopular = s.sizeId === popular;
              return (
                <label
                  key={s.sizeId}
                  className={cn(
                    "relative cursor-pointer rounded-md border bg-card text-sm transition-colors",
                    sizeLayout === "columns"
                      ? "flex h-14 flex-col items-center justify-center gap-0.5 px-2"
                      : "flex h-12 items-center justify-between gap-2 px-3",
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
                  {sizeLayout === "columns" ? (
                    <>
                      <span className="font-semibold text-charcoal">{inchesLabel(s.sizeId)}</span>
                      <span className="text-xs text-muted-foreground">{formatPrice(s.priceCents)}</span>
                      {isPopular && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-[4px] bg-sage-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                          Popular
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-charcoal">{inchesLabel(s.sizeId)}</span>
                      <span className="flex items-center gap-1.5">
                        {isPopular && (
                          <span className="rounded-md bg-sage-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sage-500">
                            Popular
                          </span>
                        )}
                        <span className="text-muted-foreground">{formatPrice(s.priceCents)}</span>
                      </span>
                    </>
                  )}
                </label>
              );
            })}
          </div>
        </fieldset>
      )}

      {buyControl()}
      {target && !target.external && (
        <p className="text-center text-xs text-muted-foreground">{SHOP_TRUST_LINE}</p>
      )}

      {stickyBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-cream/95 px-4 pb-5 pt-3 backdrop-blur-sm lg:hidden">
          <div className="flex flex-col leading-tight">
            {selectedMeta && <span className="text-xs text-muted-foreground">{inchesLabel(selectedMeta.id)}</span>}
            <span className="text-lg font-semibold text-charcoal">{priceText}</span>
          </div>
          <div className="flex-1">{buyControl(true)}</div>
        </div>
      )}
    </div>
  );
}
