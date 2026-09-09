"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Gift, Star, Truck, Clock, ShieldCheck, Lock, Mail } from "lucide-react";

import { type FreeArt } from "@/sanity/lib/client";
import { getActiveOffer, orderedSizes, fromPriceCents, formatPrice, offerImage, resolveFinish, resolveVersion } from "@/lib/commerce";
import { getShopSize, type FinishId } from "@/config/commerce";
import {
  SHOP_FEATURES,
  SHOP_GALLERY_EXTRAS,
  SHOP_PROMO,
  SHOP_SHIPPING_FAQ,
  SHOP_SIZE_GUIDE,
  SHOP_TRUST_STRIP,
} from "@/config/shop-copy";
import { REVIEW_SUMMARY } from "@/config/reviews";
import { SUPPORT_EMAIL, SUPPORT_RESPONSE } from "@/config/support";
import ArtGallery from "@/components/common/ArtGallery/ArtGallery";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import FaqAccordion from "@/components/common/FaqAccordion/FaqAccordion";
import CheckoutButton from "@/components/common/CheckoutButton/CheckoutButton";
import Testimonials from "@/components/common/Testimonials/Testimonials";
import EmailSignupForm from "@/components/common/EmailSignupForm/EmailSignupForm";

interface ShopPrintClientProps {
  art: FreeArt;
  related: FreeArt[];
}

const TRUST_ICONS = [Truck, Clock, ShieldCheck, Lock];
const SIZE_GUIDE_SLIDE = SHOP_GALLERY_EXTRAS[0];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-500">{children}</p>;
}

/**
 * Shop page (PLAN-43): print on a wall panel + one buy stack, then the sections the Poster Sport
 * reference proved out: trust strip, in the room, see it to scale, buyer reviews, complete the set,
 * questions answered, free-print email band. Buy-first (PLAN-34 decision 10).
 */
export default function ShopPrintClient({ art, related }: ShopPrintClientProps) {
  // Finish first (PLAN-46): the page owns the finish so the gallery's first slide can follow it.
  const [finish, setFinish] = useState<FinishId | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const activeVersion = resolveVersion(art, version);
  const activeFinish = resolveFinish(art, finish, activeVersion);
  const offer = getActiveOffer(art, activeFinish, activeVersion);
  const sizes = offer ? orderedSizes(offer) : [];
  const roomPhotos = (art.galleryImages ?? []).slice(0, 3);
  // an unframed print leads with the artwork itself, full bleed, so the art is the image (PLAN-49)
  const heroIsArt = activeFinish === "unframed" && !!offer?.artUrl;
  const slides = [
    { url: offerImage(offer) || art.detailImage || art.previewImage, alt: art.title },
    ...(art.galleryImages ?? []),
    ...SHOP_GALLERY_EXTRAS,
  ];
  const category = art.category?.trim();
  const quickFaq = SHOP_SHIPPING_FAQ.filter((f) => /delivery|return/i.test(f.q));

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

      {/* Hero: print + buy stack */}
      <main className="container mx-auto px-4 pb-12 pt-5 lg:grid lg:grid-cols-[1.28fr_1fr] lg:items-start lg:gap-10 lg:pt-6">
        <div className="wall-band rounded-md p-3 sm:p-5 lg:sticky lg:top-24">
          <ArtGallery
            key={`${activeVersion ?? ""}-${activeFinish ?? "default"}`}
            images={slides}
            title={art.title}
            aspectClass="aspect-[4/5]"
            frame={!heroIsArt}
            thumbs="bottom"
          />
        </div>

        <div className="mt-8 flex flex-col gap-7 lg:mt-0">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {category ? `${category} · Art print` : "Art print"}
            </p>
            <h1 className="text-[30px] font-bold leading-tight tracking-tight text-charcoal sm:text-[38px]">{art.title}</h1>
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
            finish={activeFinish}
            onFinishChange={setFinish}
            version={activeVersion}
            onVersionChange={setVersion}
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

          <div className="space-y-3 border-t border-border pt-7">
            <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-charcoal">Shipping and returns</h2>
            <FaqAccordion faq={quickFaq} />
            <Link href="/shipping-returns" className="inline-block text-sm font-medium text-sage-500 underline hover:text-sage-400">
              Full shipping and returns policy
            </Link>
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

      {/* Trust strip */}
      <section className="border-y border-border bg-card py-7">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-y-6 text-center sm:grid-cols-4 sm:gap-y-0">
            {SHOP_TRUST_STRIP.map((t, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <div key={t.label} className={`flex flex-col items-center gap-1.5 px-4 ${i > 0 ? "sm:border-l sm:border-border" : ""}`}>
                  <Icon className="size-5 text-charcoal" aria-hidden />
                  <p className="text-sm font-semibold text-charcoal">{t.label}</p>
                  <p className="text-xs text-muted-foreground">{t.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* In the room */}
      {roomPhotos.length >= 2 && (
        <section className="container mx-auto px-4 py-14 lg:py-20">
          <SectionLabel>In the room</SectionLabel>
          <h2 className="mt-2 text-[28px] font-bold tracking-tight text-charcoal">Premium quality you can see on the wall.</h2>
          <p className="mt-2 max-w-2xl text-soft-charcoal">Printed to order on 189 gsm museum-grade matte paper, unframed so you pick the frame that fits your room.</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {roomPhotos.map((img) => (
              <figure key={img.url}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted shadow-card">
                  <Image src={img.url} alt={img.alt} fill className="object-cover" sizes="(max-width: 640px) 100vw, 33vw" />
                </div>
                {!/mockup \d/i.test(img.alt) && (
                  <figcaption className="mt-3 text-sm text-soft-charcoal">{img.alt}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}

      {/* See it to scale */}
      {sizes.length > 0 && (
        <section id="size-guide" className="scroll-mt-24 border-t border-border bg-card py-14 lg:py-20">
          <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-14">
            <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-cream shadow-card">
              <Image src={SIZE_GUIDE_SLIDE.url} alt={SIZE_GUIDE_SLIDE.alt} fill className="object-cover" sizes="(max-width: 1024px) 100vw, 50vw" />
            </div>
            <div>
              <SectionLabel>Pick the right size</SectionLabel>
              <h2 className="mt-2 text-[28px] font-bold tracking-tight text-charcoal">See it to scale.</h2>
              <p className="mt-2 text-soft-charcoal">The most common regret is going too small. Every size fits a standard off-the-shelf frame.</p>
              <ul className="mt-6 divide-y divide-border rounded-md border border-border bg-cream">
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
          </div>
        </section>
      )}

      {/* Buyer reviews */}
      <section className="container mx-auto px-4 py-14 lg:py-20">
        <Testimonials limit={3} offset={3} heading="What buyers say" />
      </section>

      {/* Complete the set */}
      {related.length > 0 && (
        <section className="border-t border-border bg-card py-14 lg:py-20">
          <div className="container mx-auto px-4">
            <div className="flex items-baseline justify-between">
              <div>
                <SectionLabel>Complete the set</SectionLabel>
                <h2 className="mt-2 text-[28px] font-bold tracking-tight text-charcoal">They look better in pairs.</h2>
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
          </div>
        </section>
      )}

      {/* Questions, answered */}
      <section className="container mx-auto grid gap-10 px-4 py-14 lg:grid-cols-[1.4fr_1fr] lg:gap-14 lg:py-20">
        <div>
          <SectionLabel>Before you ask</SectionLabel>
          <h2 className="mt-2 text-[28px] font-bold tracking-tight text-charcoal">Questions, answered.</h2>
          <div className="mt-6">
            <FaqAccordion faq={[...SHOP_SHIPPING_FAQ]} />
          </div>
        </div>
        <div className="h-fit rounded-md border border-border bg-card p-6">
          <Mail className="size-5 text-sage-500" aria-hidden />
          <h3 className="mt-3 text-lg font-semibold text-charcoal">Talk to us</h3>
          <p className="mt-1 text-sm text-soft-charcoal">A real person answers {SUPPORT_RESPONSE}. Sizes, framing, a print that arrived bent, anything.</p>
          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="mt-5 inline-flex h-12 items-center justify-center rounded-md border border-charcoal px-5 text-sm font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-cream"
          >
            Email {SUPPORT_EMAIL}
          </a>
        </div>
      </section>

      {/* Free print band */}
      <section className="border-t border-border bg-sage-50 py-14">
        <div className="container mx-auto flex flex-col gap-6 px-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-charcoal">Get a new free print every month</h2>
            <p className="mt-1 text-sm text-soft-charcoal">One email a month. Unsubscribe anytime.</p>
          </div>
          <EmailSignupForm source={`print-${art.id}`} className="w-full max-w-xl" />
        </div>
      </section>
    </div>
  );
}
