"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Download, FileDown, CheckCircle2, ArrowRight } from "lucide-react";

import { type FreeArt } from "@/sanity/lib/client";
import { Button } from "@/components/ui/button";
import { getCardAspectClass } from "@/lib/image-utils";
import ArtGallery from "@/components/common/ArtGallery/ArtGallery";
import EmailGateDialog from "@/components/common/EmailGateDialog/EmailGateDialog";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import { LICENSE_SUMMARY } from "@/config/license";
import { getActiveOffer, fromPriceCents, formatPrice } from "@/lib/commerce";
import { PRINT_SIZES, deriveRatio } from "@/config/print-sizes";

interface ArtDetailClientProps {
  art: FreeArt;
  relatedArt: FreeArt[];
  /** Shop prints in the same category, for the cross-sell card (always last, PLAN-25). */
  shopPrints?: FreeArt[];
}

export default function ArtDetailClient({ art, relatedArt, shopPrints = [] }: ArtDetailClientProps) {
  const [gateOpen, setGateOpen] = useState(false);

  const ratio = art.artFile?.width && art.artFile?.height
    ? deriveRatio(art.artFile.width, art.artFile.height)
    : null;
  const printSizes = PRINT_SIZES[ratio ?? "4:5"];
  const hasFile = !!(art.artFile?.cloudinaryUrl || art.artFile?.externalUrl);

  const aspectClass = art.previewImageOrientation
    ? getCardAspectClass(art.previewImageOrientation.orientation)
    : "aspect-3/4";
  const slides = [
    { url: art.detailImage || art.previewImage, alt: art.title },
    ...(art.galleryImages ?? []),
  ];

  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <Link
            href="/free-downloads"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-sage-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to free prints
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr]">
          {/* Left Column - Image */}
          <div className="space-y-6">
            <ArtGallery images={slides} title={art.title} aspectClass={aspectClass} />

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {art.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-sage-100 px-3 py-1 text-sm font-medium text-charcoal"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="space-y-8">
            {/* Title & Artist */}
            <div className="space-y-3">
              <h1 className="text-4xl font-bold text-charcoal lg:text-5xl">
                {art.title}
              </h1>
              <p className="text-lg text-sage-500">by {art.artist}</p>
            </div>

            {/* Description */}
            <div className="space-y-4">
              <p className="text-lg leading-relaxed text-soft-charcoal">
                {art.description || art.longDescription}
              </p>
            </div>

            {/* Print Sizes */}
            <div className="space-y-4">
              <h2 className="text-2xl font-semibold text-charcoal">
                One file, many print sizes
              </h2>

              <div className="grid gap-3 sm:grid-cols-3">
                {printSizes.map((size) => (
                  <div
                    key={size.label}
                    className="rounded-md border border-border bg-card p-4"
                  >
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-sage-500" />
                      <span className="font-semibold text-charcoal">{size.label}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{size.cm}</p>
                    <p className="mt-2 text-xs text-soft-charcoal">{size.fits}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-soft-charcoal">
                One high-res file you can print at any of these sizes. Guide included.
              </p>
            </div>

            {/* Primary CTA */}
            <div className="space-y-3">
              <Button
                onClick={() => setGateOpen(true)}
                disabled={!hasFile}
                className="w-full rounded-md bg-sage-500 text-base font-semibold hover:bg-sage-400 disabled:opacity-50"
                size="lg"
              >
                <Download className="h-5 w-5" />
                <span className="ml-2">Email me this print (free)</span>
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                One email a month. Unsubscribe anytime.
              </p>
            </div>

            {/* What's included - quiet box */}
            <div className="rounded-md border border-border bg-card p-5">
              <h3 className="mb-2 flex items-center gap-2 font-semibold text-charcoal">
                <FileDown className="size-5 text-sage-500" />
                What&apos;s included
              </h3>
              <p className="mb-3 text-sm text-soft-charcoal">
                The high-res PNG, a printing guide (PDF), and the personal-use license.
              </p>
              <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">
                {LICENSE_SUMMARY}{" "}
                <Link href="/terms" className="underline hover:text-sage-500">
                  Full license
                </Link>
              </p>
            </div>

            {/* Shop cross-sell - single quiet card, always last (PLAN-25) */}
            <div className="space-y-4 rounded-md border border-border bg-card p-5">
              <h3 className="font-semibold text-charcoal">Want it printed and shipped?</h3>
              {shopPrints.length > 0 ? (
                <ul className="divide-y divide-border">
                  {shopPrints.slice(0, 3).map((item) => {
                    const from = fromPriceCents(getActiveOffer(item));
                    return (
                      <li key={item.id}>
                        <Link
                          href={`/prints/${item.id}`}
                          className="flex items-center gap-3 py-3 transition-colors hover:text-sage-500"
                        >
                          <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
                            <Image src={item.previewImage} alt={item.title} fill className="object-cover" sizes="56px" />
                          </span>
                          <span className="min-w-0 flex-1 truncate text-sm font-medium text-charcoal">{item.title}</span>
                          {from !== null && (
                            <span className="shrink-0 text-sm text-soft-charcoal">From {formatPrice(from)}</span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-sm text-soft-charcoal">Printed prints are arriving soon.</p>
              )}
              <Link
                href="/prints"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-md border border-charcoal px-5 text-sm font-semibold text-charcoal transition-all hover:bg-charcoal hover:text-cream"
              >
                Browse the prints
                <ArrowRight className="size-5" />
              </Link>
            </div>

          </div>
        </div>

        {/* Related Products Section */}
        {relatedArt.length > 0 && (
          <section className="mt-20 border-t border-border pt-12">
            <h2 className="mb-8 text-3xl font-bold text-charcoal">
              You might also like
            </h2>
            <div className="grid gap-y-8 gap-x-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-x-14">
              {relatedArt.slice(0, 3).map((relatedItem) => (
                <ArtCard
                  key={relatedItem.id}
                  art={relatedItem}
                  href={`/art/${relatedItem.id}`}
                  subtitle={relatedItem.category}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
              ))}
            </div>
          </section>
        )}
      </main>

      <EmailGateDialog
        open={gateOpen}
        onOpenChange={setGateOpen}
        artId={art.id}
        artTitle={art.title}
      />
    </div>
  );
}
