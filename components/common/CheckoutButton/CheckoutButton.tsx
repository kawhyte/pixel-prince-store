"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ShoppingBag } from "lucide-react";

import type { FreeArt, ShopSizeOffer } from "@/sanity/lib/client";
import {
  getActiveOffer,
  getOffersByFinish,
  getVersions,
  offerImage,
  resolveVersion,
  versionImage,
  orderedSizes,
  resolveCheckout,
  resolveFinish,
  formatPrice,
  fromPriceCents,
  popularSizeId,
} from "@/lib/commerce";
import {
  isSet,
  resolveSetFinish,
  sellableSet,
  setFinishes,
  setFromPriceCents,
  setSizeRows,
  setVariantIds,
} from "@/lib/sets";
import { getShopSize, inchesLabel, type FinishId } from "@/config/commerce";
import { SHOP_TRUST_LINE } from "@/config/shop-copy";
import { trackAddToCart, trackCheckoutOpened } from "@/lib/analytics";
import { buildCartCheckoutUrl } from "@/lib/fourthwall-cart";
import { useCart } from "@/components/common/Cart/CartProvider";
import FinishPicker from "@/components/common/FinishPicker/FinishPicker";
import VersionPicker from "@/components/common/VersionPicker/VersionPicker";
import { cn } from "@/lib/utils";

interface CheckoutButtonProps {
  art: FreeArt;
  campaign: string;
  /** sage = the site accent; ink = paid CTA on shop pages, keeps the accent for the free CTA */
  variant?: "sage" | "ink";
  /** grid = label left, price right; columns = label over price, 3 columns on phones, 5 on md+ */
  sizeLayout?: "grid" | "columns";
  /** selected price + size line above the picker */
  showPrice?: boolean;
  /** repeat price + Buy in a fixed bar at the bottom on < lg */
  stickyBar?: boolean;
  /** anchor to a size guide on the page */
  sizeGuideHref?: string;
  /** controlled finish (PLAN-46): the page owns it so the gallery can follow */
  finish?: FinishId | null;
  onFinishChange?: (finish: FinishId) => void;
  /** controlled artwork version (PLAN-48), same reason */
  version?: string | null;
  onVersionChange?: (version: string) => void;
  /** controlled size, so the page can print the selected price up beside the title */
  sizeId?: string | null;
  onSizeChange?: (sizeId: string) => void;
}

/**
 * Finish tiles (when more than one), size picker, Buy. Reads offers only through lib/commerce.ts.
 * With the cart configured: Add to cart + a Buy now link. Without: direct Fourthwall checkout link.
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
  finish,
  onFinishChange,
  version,
  onVersionChange,
  sizeId: sizeIdProp,
  onSizeChange,
}: CheckoutButtonProps) {
  const [localFinish, setLocalFinish] = useState<FinishId | null>(null);
  const [localVersion, setLocalVersion] = useState<string | null>(null);
  // A set has no offers of its own (PLAN-54): its prices, sizes and finishes are its members'
  // added up, and there is no version to choose because each member pins its own in Studio.
  const asSet = isSet(art) && sellableSet(art);
  const activeVersion = asSet ? null : resolveVersion(art, version ?? localVersion);
  const activeFinish = asSet
    ? resolveSetFinish(art, finish ?? localFinish)
    : resolveFinish(art, finish ?? localFinish, activeVersion);
  const offer = asSet ? null : getActiveOffer(art, activeFinish, activeVersion);
  // Typed as the offer's own row so one picker renders both. A set's rows carry no
  // providerVariantId, because a set has several: `setVariantIds` is how the cart asks.
  const sizes: ShopSizeOffer[] = asSet
    ? activeFinish
      ? setSizeRows(art, activeFinish)
      : []
    : offer
      ? orderedSizes(offer)
      : [];
  const finishKey = `${activeVersion ?? ""}:${activeFinish ?? "none"}`;
  const [pickedByFinish, setPickedByFinish] = useState<Record<string, string>>({});
  const sizeId =
    sizeIdProp ?? pickedByFinish[finishKey] ?? (asSet ? (sizes[0]?.sizeId ?? null) : popularSizeId(offer));
  const cartCtx = useCart();

  if (!offer && !asSet) return null;
  if (asSet && sizes.length === 0) return null;

  const setSizeId = (id: string) => {
    setPickedByFinish((prev) => ({ ...prev, [finishKey]: id }));
    onSizeChange?.(id);
  };
  const changeFinish = (f: FinishId) => {
    setLocalFinish(f);
    onFinishChange?.(f);
  };
  const changeVersion = (v: string) => {
    setLocalVersion(v);
    onVersionChange?.(v);
  };

  const finishOptions = asSet
    ? setFinishes(art).map((f) => ({
        finish: f,
        fromCents: setSizeRows(art, f)[0]?.priceCents ?? null,
        mockupUrl: undefined,
        fallbackImage: art.previewImage,
      }))
    : getOffersByFinish(art, activeVersion).map((x) => ({
        finish: x.finish,
        fromCents: fromPriceCents(x.offer),
        mockupUrl: offerImage(x.offer),
        fallbackImage: art.previewImage,
      }));

  // one tile per version, always the flat artwork: the art is what changes between them.
  // A set shows none: the version of each member is pinned in Studio, not chosen by the buyer.
  const versionOptions = (asSet ? [] : getVersions(art)).map((x) => ({
    version: x.version,
    imageUrl: versionImage(getActiveOffer(art, activeFinish, x.version) ?? x.offer) || art.previewImage,
  }));

  const target = offer ? resolveCheckout(offer, sizeId, campaign) : null;
  const selected = sizes.find((s) => s.sizeId === sizeId);
  const selectedMeta = selected ? getShopSize(selected.sizeId) : undefined;
  const popular = asSet ? null : popularSizeId(offer);
  const from = asSet ? setFromPriceCents(art) : fromPriceCents(offer);
  // Every print in the set, or nothing: half a set in the bag is worse than no button.
  const setLines = asSet && activeFinish && sizeId ? setVariantIds(art, activeFinish, sizeId) : null;
  const priceText = selected ? formatPrice(selected.priceCents) : from !== null ? `From ${formatPrice(from)}` : "";

  const buttonClass = cn(
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-md px-6 text-base font-semibold text-white transition-colors",
    variant === "ink" ? "bg-charcoal hover:bg-soft-charcoal" : "bg-sage-500 hover:bg-sage-400",
  );

  const useCartFlow = asSet
    ? cartCtx.enabled && !!setLines
    : cartCtx.enabled && offer!.provider === "fourthwall" && !!selected?.providerVariantId;

  const addSelected = async () => {
    const lines = asSet
      ? setLines?.map((variantId) => ({ variantId, quantity: 1 }))
      : selected?.providerVariantId
        ? [{ variantId: selected.providerVariantId, quantity: 1 }]
        : null;
    if (!lines || lines.length === 0) return null;
    const next = await cartCtx.add(lines);
    trackAddToCart(art.id, `${finishKey}:${sizeId ?? "none"}`);
    return next;
  };

  const onAddToCart = async () => {
    const next = await addSelected();
    if (next) cartCtx.setOpen(true);
  };

  const onBuyNow = async () => {
    const next = await addSelected();
    const href = next ? buildCartCheckoutUrl(next.id, campaign) : null;
    if (href) {
      trackCheckoutOpened(art.id, sizeId ?? "", "fourthwall");
      window.location.assign(href);
    }
  };

  const buyControl = (compact = false) =>
    useCartFlow ? (
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onAddToCart} disabled={cartCtx.busy} className={cn(buttonClass, "disabled:opacity-60")}>
          <ShoppingBag className="size-5" />
          {cartCtx.busy ? "Adding" : "Add to cart"}
          {selected && !compact && <span className="font-normal opacity-90">· {formatPrice(selected.priceCents)}</span>}
        </button>
        {!compact && (
          <button
            type="button"
            onClick={onBuyNow}
            disabled={cartCtx.busy}
            className="h-11 text-sm font-medium text-sage-500 underline-offset-4 hover:underline disabled:opacity-60"
          >
            Buy now, straight to checkout
          </button>
        )}
      </div>
    ) : target ? (
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
      <VersionPicker options={versionOptions} value={activeVersion} onChange={changeVersion} />
      <FinishPicker options={finishOptions} value={activeFinish} onChange={changeFinish} />

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
          {/* The Popular badge hangs -top-2 over its tile, so the column layout needs a row gap
              bigger than that or the badge sits on the tile above it. */}
          <div
            className={cn(
              "grid",
              sizeLayout === "columns" ? "grid-cols-3 gap-x-2 gap-y-5 md:grid-cols-4" : "grid-cols-2 gap-2 sm:grid-cols-3",
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
                    name={`size-${finishKey}`}
                    value={s.sizeId}
                    checked={active}
                    onChange={() => setSizeId(s.sizeId)}
                    className="sr-only"
                  />
                  {sizeLayout === "columns" ? (
                    <>
                      <span className="whitespace-nowrap font-semibold text-charcoal">{inchesLabel(s.sizeId)}</span>
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
      {(useCartFlow || (target && !target.external)) && (
        <p className="text-center text-xs text-muted-foreground">{SHOP_TRUST_LINE}</p>
      )}

      {stickyBar && (
        <div className="fixed inset-x-0 bottom-0 z-40 flex items-center gap-3 border-t border-border bg-cream/95 px-4 pb-5 pt-3 backdrop-blur-sm lg:hidden">
          <div className="flex flex-col leading-tight">
            {selectedMeta && (
              <span className="text-xs text-muted-foreground">
                {activeVersion ? `${activeVersion} · ` : ""}
                {activeFinish && finishOptions.length > 1 ? `${activeFinish} · ` : ""}
                {inchesLabel(selectedMeta.id)}
              </span>
            )}
            <span className="text-lg font-semibold text-charcoal">{priceText}</span>
          </div>
          <div className="flex-1">{buyControl(true)}</div>
        </div>
      )}
    </div>
  );
}
