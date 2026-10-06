"use client";

import Image from "next/image";
import { useState, type ReactNode } from "react";
import { Check, Star } from "lucide-react";

import { type FreeArt } from "@/sanity/lib/client";
import { getActiveOffer, orderedSizes, fromPriceCents, formatPrice, offerImage, offerImageAlt, offerImageRatio, popularSizeId, versionGallery, resolveFinish, resolveVersion } from "@/lib/commerce";
import { getShopSize, inchesLabel, type FinishId } from "@/config/commerce";
// The same numbers Studio validates uploads against, so the check and the layout cannot drift.
import { HERO_MAX_WIDTH, heroFrame } from "@/config/shop-image";
import { imageAlt } from "@/lib/listing-copy";
import { shopGalleryExtras, SIZE_GUIDE_IMAGE, SHOP_SIZE_GUIDE } from "@/config/shop-copy";
import { REVIEW_SUMMARY } from "@/config/reviews";
import ArtGallery from "@/components/common/ArtGallery/ArtGallery";
import CheckoutButton from "@/components/common/CheckoutButton/CheckoutButton";
import { isSet, resolveSetFinish, sellableSet, setFromPriceCents, setSizeRows } from "@/lib/sets";
import { SectionLabel } from "./section-label";

interface ShopPrintClientProps {
  art: FreeArt;
  /** "Sep 15 to 21", worked out on the server so the date is the same one the HTML shipped with */
  deliveryBy: string;
  /** server-rendered: everything in the buy column below the picker */
  belowBuy: ReactNode;
  /** server-rendered: the sections between the hero and the size guide */
  afterHero: ReactNode;
}

const SIZE_GUIDE_SLIDE = SIZE_GUIDE_IMAGE;

/**
 * The interactive part of the shop page (PLAN-43): gallery, price and picker, plus the size guide,
 * whose prices follow the chosen finish. The static sections render on the server
 * (./shop-print-sections.tsx) and arrive here as `belowBuy` / `afterHero`.
 */
export default function ShopPrintClient({ art, deliveryBy, belowBuy, afterHero }: ShopPrintClientProps) {
  // Finish first (PLAN-46): the page owns the finish so the gallery's first slide can follow it.
  const [finish, setFinish] = useState<FinishId | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  // A set has no offers of its own (PLAN-54): its finishes, sizes and prices are its members'.
  const asSet = isSet(art) && sellableSet(art);
  const activeVersion = asSet ? null : resolveVersion(art, version);
  const activeFinish = asSet ? resolveSetFinish(art, finish) : resolveFinish(art, finish, activeVersion);
  const offer = asSet ? null : getActiveOffer(art, activeFinish, activeVersion);
  const sizes: { sizeId: string; priceCents: number }[] = asSet
    ? activeFinish
      ? setSizeRows(art, activeFinish)
      : []
    : offer
      ? orderedSizes(offer)
      : [];
  // Room photos belong to the artwork and show whichever finish is on screen (PLAN-52).
  const galleryImages = art.galleryImages ?? [];
  // Every room photo is a slide, up to the 10 the field allows. Reorder them in Studio.
  const slides = [
    {
      url: offerImage(offer) || art.detailImage || art.previewImage,
      // the main image is the one search engines weigh most, so it says what it is. Whatever is
      // typed on the offer in Studio wins; the generated line is the floor, never a blank alt.
      alt:
        offerImageAlt(offer) ??
        imageAlt({ title: art.title, version: activeVersion, finish: activeFinish ?? undefined, kind: "main" }),
    },
    // this colorway's own photos come before the ones the whole print shares
    ...versionGallery(art, activeVersion, activeFinish).map((img) => ({
      url: img.url,
      alt: img.alt?.trim() || imageAlt({ title: art.title, version: activeVersion, finish: activeFinish ?? undefined, kind: "room" }),
    })),
    ...galleryImages,
    // the framed spec card only joins the gallery when the framed finish is on screen
    ...shopGalleryExtras(activeFinish),
  ]
    // One photo, one slide. The same image can sit on an offer and in its gallery, or in room
    // photos, and each of those is a reasonable thing to do on its own; together they put the
    // picture in the strip twice, which reads as a mistake because it is one.
    .filter((slide, i, all) => slide.url && all.findIndex((s) => s.url === slide.url) === i);
  // Cut the frame to the photo. Without this the frame was a fixed 4:5 and a 3:4 photo sat inside
  // it with grey bars down both sides.
  const heroRatio = offerImageRatio(offer);
  // The frame is cut to the photo, so a tall photo made a tall frame: a 2:3 room shot ran to 855
  // where a 3:4 one stops at 760, which reads as a different page per finish and pushed the column
  // past what a sticky viewport can show. Cap the height instead and let the width give way, so the
  // photo is never cropped and never gets grey bars. 760 is the 3:4 photo's own height at 570 wide,
  // so the tallest frame now matches the shape we already had.
  const heroMaxWidth = heroRatio ? Math.round(heroFrame(heroRatio).width) : HERO_MAX_WIDTH;
  // The page owns the chosen size for the same reason it owns finish and version: the price belongs
  // under the title, above the rating, and it has to move when the picker does.
  const [sizeByOffer, setSizeByOffer] = useState<Record<string, string>>({});
  const offerKey = `${activeVersion ?? ""}:${activeFinish ?? "none"}`;
  // A size picked under one finish only carries over when this finish sells it too.
  const pickedSizeId = sizeByOffer[offerKey];
  const activeSizeId =
    pickedSizeId && sizes.some((s) => s.sizeId === pickedSizeId)
      ? pickedSizeId
      : asSet
        ? (sizes[0]?.sizeId ?? null)
        : popularSizeId(offer);
  const selectedSize = sizes.find((s) => s.sizeId === activeSizeId);
  const fromCents = asSet ? setFromPriceCents(art) : fromPriceCents(offer);
  const priceText = selectedSize
    ? formatPrice(selectedSize.priceCents)
    : fromCents !== null
      ? `From ${formatPrice(fromCents)}`
      : "";
  const category = art.category?.trim();

  return (
    <>
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

          {belowBuy}
        </div>
      </main>

      {afterHero}

      {/* See it to scale */}
      {sizes.length > 0 && (
        <section id="size-guide" className="scroll-mt-24 border-t border-border bg-card py-14 lg:py-20">
          {/* The size guide is a static 1086 px file (public/shop/size-guide.webp). Half of that is
              543, the widest it goes before a 2x screen stretches it, and it happens to sit right
              next to the hero's own 570 so the two sections read as one page. Centred, so the room
              left over lands in the page margins rather than between the photo and the list. Swap
              in a wider file and this number can grow with it. */}
          <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[543px_minmax(0,640px)] lg:justify-center lg:items-center lg:gap-14">
            {/* 3:4 to match the photo, so the 24x36 label at the top is not cropped away */}
            <div className="relative aspect-[3/4] overflow-hidden rounded-md bg-cream shadow-card">
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
    </>
  );
}
