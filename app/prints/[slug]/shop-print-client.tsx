"use client";

import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, CheckCircle2, Gift, Star, Truck, Clock, ShieldCheck, Lock, Mail } from "lucide-react";

import { type FreeArt } from "@/sanity/lib/client";
import { getActiveOffer, orderedSizes, fromPriceCents, formatPrice, offerImage, offerImageRatio, popularSizeId, resolveFinish, resolveVersion } from "@/lib/commerce";
import { getShopSize, inchesLabel, type FinishId } from "@/config/commerce";
import { imageAlt } from "@/lib/listing-copy";
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
  /** "Sep 15 to 21", worked out on the server so the date is the same one the HTML shipped with */
  deliveryBy: string;
}

const TRUST_ICONS = [Truck, Clock, ShieldCheck, Lock];
/**
 * Shop photos are 1140x1520 (sanity/lib/image-rules.ts). 570 is the widest one goes before a 2x
 * screen starts inventing pixels, and 760 is that same photo's height, which makes it the natural
 * ceiling for a taller shape. A photo taller than 3:4 is shown narrower rather than cropped.
 */
const HERO_MAX_WIDTH = 570;
const HERO_MAX_HEIGHT = 760;
const SIZE_GUIDE_SLIDE = SHOP_GALLERY_EXTRAS[0];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-500">{children}</p>;
}

/**
 * Shop page (PLAN-43): print on a wall panel + one buy stack, then the sections the Poster Sport
 * reference proved out: trust strip, in the room, see it to scale, buyer reviews, complete the set,
 * questions answered, free-print email band. Buy-first (PLAN-34 decision 10).
 */
export default function ShopPrintClient({ art, related, deliveryBy }: ShopPrintClientProps) {
  // Finish first (PLAN-46): the page owns the finish so the gallery's first slide can follow it.
  const [finish, setFinish] = useState<FinishId | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const activeVersion = resolveVersion(art, version);
  const activeFinish = resolveFinish(art, finish, activeVersion);
  const offer = getActiveOffer(art, activeFinish, activeVersion);
  const sizes = offer ? orderedSizes(offer) : [];
  // Room photos belong to the artwork and show whichever finish is on screen (PLAN-52).
  const galleryImages = art.galleryImages ?? [];
  const roomPhotos = galleryImages.slice(0, 3);
  // Every room photo is a slide, up to the 10 the field allows. Reorder them in Studio.
  const slides = [
    {
      url: offerImage(offer) || art.detailImage || art.previewImage,
      // the main image is the one search engines weigh most, so it says what it is
      alt: imageAlt({ title: art.title, version: activeVersion, finish: activeFinish ?? undefined, kind: "main" }),
    },
    ...galleryImages,
    ...SHOP_GALLERY_EXTRAS,
  ];
  // Cut the frame to the photo. Without this the frame was a fixed 4:5 and a 3:4 photo sat inside
  // it with grey bars down both sides.
  const heroRatio = offerImageRatio(offer);
  // The frame is cut to the photo, so a tall photo made a tall frame: a 2:3 room shot ran to 855
  // where a 3:4 one stops at 760, which reads as a different page per finish and pushed the column
  // past what a sticky viewport can show. Cap the height instead and let the width give way, so the
  // photo is never cropped and never gets grey bars. 760 is the 3:4 photo's own height at 570 wide,
  // so the tallest frame now matches the shape we already had.
  const heroMaxWidth = Math.round(Math.min(HERO_MAX_WIDTH, heroRatio ? HERO_MAX_HEIGHT * heroRatio : HERO_MAX_WIDTH));
  // The page owns the chosen size for the same reason it owns finish and version: the price belongs
  // under the title, above the rating, and it has to move when the picker does.
  const [sizeByOffer, setSizeByOffer] = useState<Record<string, string>>({});
  const offerKey = `${activeVersion ?? ""}:${activeFinish ?? "none"}`;
  const activeSizeId = sizeByOffer[offerKey] ?? popularSizeId(offer);
  const selectedSize = sizes.find((s) => s.sizeId === activeSizeId);
  const fromCents = fromPriceCents(offer);
  const priceText = selectedSize
    ? formatPrice(selectedSize.priceCents)
    : fromCents !== null
      ? `From ${formatPrice(fromCents)}`
      : "";
  const category = art.category?.trim();
  // Cost, timing and returns are the three the buy stack answers up front; the rest stay lower down.
  const quickFaq = SHOP_SHIPPING_FAQ.filter((f) => /delivery|shipping\?|return/i.test(f.q));

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
      {/* Both columns have a real ceiling, so the grid states them rather than dividing what is
          there. 570 is the widest a 1140 px photo goes before a 2x screen starts inventing pixels.
          640 is about as wide as the buy stack should get: past that the finish tiles blow up and
          push the size picker off the screen. Below lg the second track shrinks to whatever is
          left. justify-center keeps the pair in the middle, so the room left over on a wide screen
          sits in the page margins instead of opening a gap between the print and the buy stack. */}
      <main className="container mx-auto px-4 pb-12 pt-5 lg:grid lg:grid-cols-[570px_minmax(0,640px)] lg:justify-center lg:items-start lg:gap-10 lg:pt-6">
        {/* No wall panel behind the photo: the photo already has a room in it, and the panel only
            showed as a beige border down each side. Shop photos are 1140x1520
            (sanity/lib/image-rules.ts), so on a 2x screen the photo can fill 570 css px before the
            browser starts inventing pixels and going soft. Letting it grow past that also made the
            column taller than a sticky viewport can show, which cropped the thumbnails off the
            bottom. These caps are the photo's own width, so they match the `sizes` hint below. */}
        <div
          className="mx-auto w-full max-w-[416px] sm:max-w-[480px] lg:max-w-[var(--hero-w)] lg:sticky lg:top-24"
          style={{ "--hero-w": `${heroMaxWidth}px` } as React.CSSProperties}
        >
          <ArtGallery
            key={`${activeVersion ?? ""}-${activeFinish ?? "default"}`}
            images={slides}
            title={art.title}
            aspectClass="aspect-[4/5]"
            aspectRatio={heroRatio}
            thumbs="bottom"
            sizes={`(max-width: 640px) 416px, (max-width: 1024px) 480px, ${heroMaxWidth}px`}
          />
        </div>

        <div className="mt-8 flex flex-col gap-7 lg:mt-0">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              {category ? `${category} · Art print` : "Art print"}
            </p>
            <h1 className="text-[30px] font-bold leading-tight tracking-tight text-charcoal sm:text-[38px]">{art.title}</h1>
            {priceText && (
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pt-1">
                <span className="text-[28px] font-semibold text-charcoal">{priceText}</span>
                {/* Just the size here. Free shipping is the check line directly below, so saying it
                    twice inside two lines of each other only makes both lines weaker. */}
                {selectedSize && (
                  <span className="text-sm text-muted-foreground">{inchesLabel(selectedSize.sizeId)}</span>
                )}
              </div>
            )}
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

            {/* The two questions a buyer has before they commit: what does postage cost, and when
                does it land. Both are stated once here and deliberately not repeated in the bullets
                under the buy controls. No returns line: prints are made to order, so the honest
                version of that promise is the damage guarantee further down. */}
            <ul className="space-y-1.5 pt-2">
              <li className="flex items-start gap-2 text-sm text-soft-charcoal">
                <Check className="mt-0.5 size-4 shrink-0 text-sage-500" aria-hidden />
                <span>
                  <span className="font-semibold text-charcoal">Free US shipping</span>, no minimum
                </span>
              </li>
              <li className="flex items-start gap-2 text-sm text-soft-charcoal">
                <Check className="mt-0.5 size-4 shrink-0 text-sage-500" aria-hidden />
                <span>
                  Get it by <span className="font-semibold text-charcoal">{deliveryBy}</span> if you order today
                </span>
              </li>
            </ul>
          </div>

          <CheckoutButton
            art={art}
            campaign={`print-${art.id}`}
            variant="ink"
            sizeLayout="columns"
            stickyBar
            sizeGuideHref="#size-guide"
            finish={activeFinish}
            onFinishChange={setFinish}
            version={activeVersion}
            onVersionChange={setVersion}
            sizeId={activeSizeId}
            onSizeChange={(id) => setSizeByOffer((prev) => ({ ...prev, [offerKey]: id }))}
          />

          {/* Under the buy controls, below CheckoutButton's own trust line: paper, shipping and the
              guarantee are what a shopper reads after they have picked a size, not before. */}
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
                  <Image src={img.url} alt={img.alt} fill className="object-contain" sizes="(max-width: 640px) 100vw, 33vw" />
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
