"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2, Gift, Star } from "lucide-react";

import { type FreeArt } from "@/sanity/lib/client";
import { getActiveOffer, orderedSizes, fromPriceCents, formatPrice } from "@/lib/commerce";
import { getShopSize } from "@/config/commerce";
import { SHOP_FEATURES, SHOP_GALLERY_EXTRAS, SHOP_PROMO, SHOP_SHIPPING_FAQ, SHOP_SIZE_GUIDE } from "@/config/shop-copy";
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

/**
 * Shop page (PLAN-43, Direction B balanced like the Poster Sport reference): the print hangs on
 * a wall panel that fills the left column, thumbnails under it; the right column is one long
 * stack (title, price, rating, callouts, sizes, buy, story, size guide, FAQ, reviews) so both
 * columns run the same height. Buy-first (PLAN-34 decision 10). Free prints never render here.
 */
export default function ShopPrintClient({ art, related }: ShopPrintClientProps) {
  const offer = getActiveOffer(art);
  const sizes = offer ? orderedSizes(offer) : [];
  const slides = [
    { url: art.detailImage || art.previewImage, alt: art.title },
    ...(art.galleryImages ?? []),
    ...SHOP_GALLERY_EXTRAS,
  ];
  const category = art.category?.trim();

  return (
    <div className="min-h-screen bg-cream pb-24 lg:pb-0">
      <div className="container mx-auto px-4 pt-5 sm:pt-6">
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
      </div>

      <main className="container mx-auto px-4 pb-16 pt-5 lg:grid lg:grid-cols-[1.05fr_1fr] lg:items-start lg:gap-14 lg:pt-6">
        {/* Left: the print on the wall, thumbnails under it */}
        <div className="wall-band rounded-md p-4 sm:p-8 lg:sticky lg:top-24">
          <ArtGallery images={slides} title={art.title} aspectClass="aspect-[4/5]" frame thumbs="bottom" />
        </div>

        {/* Right: everything else, one stack */}
        <div className="mt-8 flex flex-col gap-7 lg:mt-0">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {category ? `${category} · Art print` : "Art print"}
            </p>
            <h1 className="text-[30px] font-bold leading-tight tracking-tight text-charcoal sm:text-[38px]">
              {art.title}
            </h1>
            <div className="flex items-center gap-2">
              <span className="flex gap-0.5" aria-label={`${REVIEW_SUMMARY.rating} out of 5 stars`}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="size-3.5 fill-current text-sage-500" aria-hidden />
                ))}
              </span>
              <span className="text-sm text-soft-charcoal">
                {REVIEW_SUMMARY.rating} · {REVIEW_SUMMARY.count} {REVIEW_SUMMARY.source}
              </span>
            </div>
          </div>

          <ul className="space-y-2.5">
            {SHOP_FEATURES.map((f) => (
              <li key={f.title} className="flex items-start gap-3 text-sm">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-sage-500" aria-hidden />
                <span className="text-soft-charcoal">
                  <span className="font-semibold text-charcoal">{f.title}.</span> {f.body}
                </span>
              </li>
            ))}
          </ul>

          <CheckoutButton
            art={art}
            campaign={`print-${art.id}`}
            variant="ink"
            sizeLayout="columns"
            showPrice
            stickyBar
            sizeGuideHref="#size-guide"
          />

          {SHOP_PROMO.enabled && (
            <div className="flex items-center gap-3 rounded-md bg-sage-50 px-4 py-3 text-sm text-charcoal">
              <Gift className="size-4 shrink-0 text-sage-500" />
              <span>
                <strong>{SHOP_PROMO.headline}</strong> {SHOP_PROMO.body}, {SHOP_PROMO.note.toLowerCase()}.
              </span>
            </div>
          )}

          <div className="space-y-3 border-t border-border pt-7">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal">About the print</h2>
            <p className="text-base leading-relaxed text-soft-charcoal">{art.longDescription || art.description}</p>
          </div>

          {sizes.length > 0 && (
            <div id="size-guide" className="scroll-mt-24 space-y-3 border-t border-border pt-7">
              <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal">Pick the right size</h2>
              <ul className="divide-y divide-border rounded-md border border-border bg-card">
                {sizes.map((s) => {
                  const meta = getShopSize(s.sizeId);
                  return (
                    <li key={s.sizeId} className="flex items-center justify-between gap-4 px-4 py-3 text-sm">
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

          <div className="space-y-3 border-t border-border pt-7">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal">Shipping and returns</h2>
            <FaqAccordion faq={[...SHOP_SHIPPING_FAQ]} />
            <Link href="/shipping-returns" className="inline-block text-sm font-medium text-sage-500 underline hover:text-sage-400">
              Full shipping and returns policy
            </Link>
          </div>

          <div className="border-t border-border pt-7">
            <Testimonials variant="quotes" limit={2} offset={3} heading="From other buyers" showSummary={false} />
          </div>

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
