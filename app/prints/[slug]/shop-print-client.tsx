"use client";

import Link from "next/link";
import { ArrowLeft, CheckCircle2 } from "lucide-react";

import { type FreeArt } from "@/sanity/lib/client";
import { getCardAspectClass } from "@/lib/image-utils";
import { getActiveOffer, orderedSizes, priceRangeCents, fromPriceCents, formatPrice } from "@/lib/commerce";
import { getShopSize } from "@/config/commerce";
import { SHOP_FEATURES, SHOP_SHIPPING_FAQ, SHOP_SIZE_GUIDE } from "@/config/shop-copy";
import ArtGallery from "@/components/common/ArtGallery/ArtGallery";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import FaqAccordion from "@/components/common/FaqAccordion/FaqAccordion";
import CheckoutButton from "@/components/common/CheckoutButton/CheckoutButton";
import Testimonials from "@/components/common/Testimonials/Testimonials";

interface ShopPrintClientProps {
  art: FreeArt;
  related: FreeArt[];
}

/** Buy-first shop page (PLAN-34 decision 10). Free prints never render here. */
export default function ShopPrintClient({ art, related }: ShopPrintClientProps) {
  const offer = getActiveOffer(art);
  const range = priceRangeCents(offer);
  const sizes = offer ? orderedSizes(offer) : [];

  const aspectClass = art.previewImageOrientation
    ? getCardAspectClass(art.previewImageOrientation.orientation)
    : "aspect-3/4";
  const slides = [{ url: art.detailImage || art.previewImage, alt: art.title }, ...(art.galleryImages ?? [])];

  return (
    <div className="min-h-screen bg-cream">
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/prints"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-sage-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to prints
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr]">
          {/* Left: gallery */}
          <div className="space-y-6">
            <ArtGallery images={slides} title={art.title} aspectClass={aspectClass} />
            <div className="flex flex-wrap gap-2">
              {art.tags.map((tag) => (
                <span key={tag} className="rounded-md bg-sage-100 px-3 py-1 text-sm font-medium text-charcoal">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right: buy first */}
          <div className="space-y-8">
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-charcoal lg:text-5xl">{art.title}</h1>
              <p className="text-lg text-sage-500">by {art.artist}</p>
              {range && (
                <p className="text-2xl font-semibold text-charcoal">
                  {range.min === range.max ? formatPrice(range.min) : `From ${formatPrice(range.min)}`}
                </p>
              )}
            </div>

            <CheckoutButton art={art} campaign={`print-${art.id}`} />

            <div className="grid gap-3 sm:grid-cols-3">
              {SHOP_FEATURES.map((f) => (
                <div key={f.title} className="rounded-md border border-border bg-card p-4">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-sage-500" />
                    <span className="text-sm font-semibold text-charcoal">{f.title}</span>
                  </div>
                  <p className="mt-2 text-xs text-soft-charcoal">{f.body}</p>
                </div>
              ))}
            </div>

            <p className="text-lg leading-relaxed text-soft-charcoal">{art.longDescription || art.description}</p>

            {sizes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold text-charcoal">Pick the right size</h2>
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

            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-charcoal">Shipping and returns</h2>
              <FaqAccordion faq={[...SHOP_SHIPPING_FAQ]} />
              <Link href="/shipping-returns" className="inline-block text-sm font-medium text-sage-500 underline hover:text-sage-400">
                Full shipping and returns policy
              </Link>
            </div>

            <Testimonials limit={3} offset={3} heading="From other buyers" />

            <div className="rounded-md border border-border bg-card p-5">
              <p className="text-sm text-charcoal">
                Looking for a free printable?{" "}
                <Link href="/free-downloads" className="font-semibold underline hover:text-sage-500">
                  Every print in the free library
                </Link>{" "}
                costs nothing.
              </p>
            </div>
          </div>
        </div>

        {related.length > 0 && (
          <section className="mt-20 border-t border-border pt-12">
            <h2 className="mb-2 text-3xl font-bold text-charcoal">Complete the set</h2>
            <p className="mb-8 text-soft-charcoal">They look better in pairs.</p>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {related.slice(0, 3).map((item) => {
                const from = fromPriceCents(getActiveOffer(item));
                return (
                  <ArtCard
                    key={item.id}
                    art={item}
                    href={`/prints/${item.id}`}
                    subtitle={item.category}
                    meta="Art print"
                    value={from !== null ? `From ${formatPrice(from)}` : ""}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                );
              })}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
