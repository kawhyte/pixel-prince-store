"use client";

import Link from "next/link";
import { ArrowLeft, Gift, Star } from "lucide-react";

import { type FreeArt } from "@/sanity/lib/client";
import { getActiveOffer, orderedSizes, fromPriceCents, formatPrice } from "@/lib/commerce";
import { getShopSize } from "@/config/commerce";
import { SHOP_PROMO, SHOP_SHIPPING_FAQ, SHOP_SIZE_GUIDE } from "@/config/shop-copy";
import { REVIEW_SUMMARY } from "@/config/reviews";
import ArtGallery from "@/components/common/ArtGallery/ArtGallery";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import FaqAccordion from "@/components/common/FaqAccordion/FaqAccordion";
import CheckoutButton from "@/components/common/CheckoutButton/CheckoutButton";
import Testimonials from "@/components/common/Testimonials/Testimonials";

interface ShopPrintClientProps {
  art: FreeArt;
  related: FreeArt[];
}

const SPECS = [
  { k: "Paper", v: "189 gsm enhanced matte" },
  { k: "Made", v: "To order, in the USA" },
  { k: "Frame", v: "Not included, standard sizes" },
  { k: "Damaged on arrival", v: "Reprinted free" },
] as const;

/**
 * Shop page, Direction B "on the wall" (PLAN-43): the print hangs on a warm wall band,
 * the buying decision lives in a white card beside it. Buy-first (PLAN-34 decision 10).
 * Free prints never render here.
 */
export default function ShopPrintClient({ art, related }: ShopPrintClientProps) {
  const offer = getActiveOffer(art);
  const sizes = offer ? orderedSizes(offer) : [];
  const slides = [{ url: art.detailImage || art.previewImage, alt: art.title }, ...(art.galleryImages ?? [])];
  const category = art.category?.trim();

  return (
    <div className="min-h-screen bg-cream pb-24 lg:pb-0">
      {/* Wall band */}
      <section className="wall-band border-b border-border">
        <div className="container mx-auto px-4 pb-14 pt-4 sm:pt-6 lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:py-16">
          {/* Left: breadcrumb + the print on the wall */}
          <div className="flex flex-col gap-5">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground">
              <Link href="/prints" className="inline-flex items-center gap-2 transition-colors hover:text-sage-500">
                <ArrowLeft className="h-4 w-4" />
                Prints
              </Link>
              {category && (
                <>
                  <span className="text-border">/</span>
                  <span>{category}</span>
                </>
              )}
            </nav>
            <div className="mx-auto mt-2 w-full max-w-[560px]">
              <ArtGallery images={slides} title={art.title} aspectClass="aspect-[4/5]" frame thumbs="center" />
            </div>
          </div>

          {/* Right: buy card, slides up over the wall on phones */}
          <div className="-mt-6 rounded-md border border-border bg-card p-5 shadow-card-hover sm:p-8 lg:mt-0">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {category ? `${category} · Art print` : "Art print"}
              </p>
              <h1 className="text-[26px] font-bold leading-tight tracking-tight text-charcoal sm:text-[34px]">
                {art.title}
              </h1>
              <div className="flex items-center gap-2">
                <span className="flex gap-0.5" aria-label={`${REVIEW_SUMMARY.rating} out of 5 stars`}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="size-3.5 fill-current text-sage-500" aria-hidden />
                  ))}
                </span>
                <span className="text-xs text-muted-foreground">
                  {REVIEW_SUMMARY.rating} · {REVIEW_SUMMARY.count} {REVIEW_SUMMARY.source}
                </span>
              </div>
            </div>

            <div className="mt-5">
              <CheckoutButton
                art={art}
                campaign={`print-${art.id}`}
                variant="ink"
                sizeLayout="columns"
                showPrice
                stickyBar
                sizeGuideHref="#size-guide"
              />
            </div>

            <dl className="mt-6 divide-y divide-border border-t border-border text-sm">
              {SPECS.map((row) => (
                <div key={row.k} className="flex items-center justify-between py-3">
                  <dt className="text-soft-charcoal">{row.k}</dt>
                  <dd className="font-medium text-charcoal">{row.v}</dd>
                </div>
              ))}
            </dl>

            {SHOP_PROMO.enabled && (
              <div className="mt-5 flex items-center gap-3 rounded-md bg-sage-50 px-4 py-3 text-sm text-charcoal">
                <Gift className="size-4 shrink-0 text-sage-500" />
                <span>
                  <strong>{SHOP_PROMO.headline}</strong> {SHOP_PROMO.body}, {SHOP_PROMO.note.toLowerCase()}.
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Story + reviews */}
      <main className="container mx-auto px-4 py-14 lg:grid lg:grid-cols-[1.2fr_1fr] lg:gap-16 lg:py-16">
        <div className="space-y-6">
          <h2 className="text-[28px] font-bold tracking-tight text-charcoal">About this print</h2>
          <p className="max-w-[640px] text-lg leading-relaxed text-soft-charcoal">{art.longDescription || art.description}</p>

          {sizes.length > 0 && (
            <div id="size-guide" className="max-w-[640px] scroll-mt-24 space-y-3">
              <h3 className="text-xl font-semibold text-charcoal">Pick the right size</h3>
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {sizes.map((s) => {
                  const meta = getShopSize(s.sizeId);
                  return (
                    <li key={s.sizeId} className="flex items-center justify-between gap-4 p-4 text-sm">
                      <div>
                        <span className="font-semibold text-charcoal">{meta?.label ?? s.sizeId}</span>
                        <span className="ml-2 text-muted-foreground">{meta?.cm}</span>
                        <p className="mt-0.5 text-xs text-soft-charcoal">{SHOP_SIZE_GUIDE[s.sizeId]}</p>
                      </div>
                      <span className="shrink-0 font-semibold text-charcoal">{formatPrice(s.priceCents)}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          <div className="max-w-[640px] space-y-3">
            <h3 className="text-xl font-semibold text-charcoal">Shipping and returns</h3>
            <FaqAccordion faq={[...SHOP_SHIPPING_FAQ]} />
            <Link href="/shipping-returns" className="inline-block text-sm font-medium text-sage-500 underline hover:text-sage-400">
              Full shipping and returns policy
            </Link>
          </div>
        </div>

        <div className="mt-12 space-y-6 lg:mt-0">
          <Testimonials variant="quotes" limit={2} offset={3} heading="From other buyers" showSummary={false} />
          <div className="rounded-md border border-border bg-card p-5 text-sm text-charcoal">
            Looking for a free printable?{" "}
            <Link href="/free-downloads" className="font-semibold underline hover:text-sage-500">
              Every print in the free library
            </Link>{" "}
            costs nothing.
          </div>
        </div>
      </main>

      {related.length > 0 && (
        <section className="container mx-auto border-t border-border px-4 pb-16 pt-12">
          <div className="flex items-baseline justify-between">
            <div>
              <h2 className="text-[28px] font-bold tracking-tight text-charcoal">Complete the set</h2>
              <p className="mt-1 text-soft-charcoal">They look better in pairs.</p>
            </div>
            <Link href="/prints" className="text-sm font-semibold text-sage-500 hover:text-sage-400">
              All prints
            </Link>
          </div>
          <div className="mt-8 flex snap-x gap-4 overflow-x-auto pb-2 [scrollbar-width:none] sm:grid sm:grid-cols-2 sm:overflow-visible lg:grid-cols-4 lg:gap-6 [&::-webkit-scrollbar]:hidden">
            {related.slice(0, 4).map((item) => {
              const from = fromPriceCents(getActiveOffer(item));
              return (
                <div key={item.id} className="w-[70%] shrink-0 snap-start sm:w-auto">
                  <ArtCard
                    art={item}
                    href={`/prints/${item.id}`}
                    subtitle={item.category}
                    meta="Art print"
                    value={from !== null ? `From ${formatPrice(from)}` : ""}
                    sizes="(max-width: 640px) 70vw, (max-width: 1024px) 50vw, 25vw"
                  />
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
