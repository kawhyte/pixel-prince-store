import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Gift, Truck, Clock, ShieldCheck, Lock, Mail } from "lucide-react";

import { type FreeArt } from "@/sanity/lib/client";
import { cardCommerce } from "@/lib/commerce";
import { SHOP_FEATURES, SHOP_PROMO, SHOP_SHIPPING_FAQ, SHOP_TRUST_STRIP } from "@/config/shop-copy";
import { SUPPORT_EMAIL, SUPPORT_RESPONSE } from "@/config/support";
import { isSet, sellableSet, setMembers } from "@/lib/sets";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import FaqAccordion from "@/components/common/FaqAccordion/FaqAccordion";
import Testimonials from "@/components/common/Testimonials/Testimonials";
import EmailSignupForm from "@/components/common/EmailSignupForm/EmailSignupForm";
import { SectionLabel } from "./section-label";

/**
 * The parts of the print page that do not change when the buyer picks a finish, version or size.
 * They render on the server, so none of their code ships to the browser; only the gallery, price
 * and picker in ./shop-print-client.tsx do.
 */

const TRUST_ICONS = [Truck, Clock, ShieldCheck, Lock];

export function PrintBreadcrumb({ category }: { category?: string }) {
  return (
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
  );
}

/** Everything in the buy column below the picker. */
export function BuyStackDetails({ art, pairs }: { art: FreeArt; pairs: FreeArt[] }) {
  const asSet = isSet(art) && sellableSet(art);
  // Cost, timing and returns are the three the buy stack answers up front; the rest stay lower down.
  const quickFaq = SHOP_SHIPPING_FAQ.filter((f) => /delivery|shipping\?|return/i.test(f.q));
  return (
    <>
      {/* What is actually in a set, each linking to its own page. A buyer should be able to
          see the two prints they are being sold and go and read about either, because both are
          still on sale on their own and this is not a bundle of things they cannot inspect. */}
      {asSet && (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            What is in this set
          </p>
          <ul className="mt-3 space-y-3">
            {setMembers(art).map((m) => (
              <li key={m.id}>
                <Link
                  href={`/prints/${m.slug || m.id}`}
                  className="group flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                >
                  <span className="relative size-12 shrink-0 overflow-hidden rounded border border-border bg-muted">
                    {m.previewImage?.asset?.url && (
                      <Image src={m.previewImage.asset.url} alt="" fill className="object-cover" sizes="48px" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-charcoal group-hover:text-sage-500">
                      {m.title}
                    </span>
                    {m.version && (
                      <span className="block text-xs text-muted-foreground">{m.version}</span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-soft-charcoal">
            Both prints ship together. Each is also sold on its own.
          </p>
        </div>
      )}

      {/* The same "Pairs well with" the bag shows, here while the buyer is still deciding. A set
          holding this print leads, then its category. Clicks counted by Umami's data attributes,
          so this stays server HTML. */}
      {pairs.length > 0 && (
        <div className="rounded-md border border-border bg-card p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Pairs well with</p>
          <ul className="mt-3 space-y-3">
            {pairs.map((p) => {
              const card = cardCommerce(p);
              const thumb = p.previewImage || setMembers(p)[0]?.previewImage?.asset?.url;
              return (
                <li key={p.id}>
                  <Link
                    href={card.href}
                    data-umami-event="print_pairing_clicked"
                    data-umami-event-slug={p.id}
                    data-umami-event-from={art.id}
                    className="group flex items-center gap-3 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sage-500"
                  >
                    <span className="relative size-12 shrink-0 overflow-hidden rounded border border-border bg-muted">
                      {thumb && <Image src={thumb} alt="" fill className="object-cover" sizes="48px" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-charcoal group-hover:text-sage-500">
                        {p.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {isSet(p) ? `${card.meta}, includes this print` : card.meta}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-charcoal">{card.value}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

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
    </>
  );
}

/** Trust strip + room photos: between the hero and the size guide. */
export function AfterHero({ art }: { art: FreeArt }) {
  // Room photos belong to the artwork and show whichever finish is on screen (PLAN-52).
  const roomPhotos = (art.galleryImages ?? []).slice(0, 3);
  return (
    <>
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
          <p className="mt-2 max-w-2xl text-soft-charcoal">
            Printed to order on 189 gsm museum-grade matte paper. Take it unframed and choose your own frame, or
            framed in black wood and ready to hang.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            {roomPhotos.map((img) => (
              <figure key={img.url}>
                <div className="relative aspect-[4/5] overflow-hidden rounded-md bg-muted shadow-card">
                  <Image src={img.url} alt={img.alt} fill className="object-contain" sizes="(max-width: 640px) calc(100vw - 32px), (max-width: 1536px) 31vw, 485px" />
                </div>
                {!/mockup \d/i.test(img.alt) && (
                  <figcaption className="mt-3 text-sm text-soft-charcoal">{img.alt}</figcaption>
                )}
              </figure>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/** Reviews, the rest of the set, questions and the free-print band. */
export function BelowSizeGuide({ art, related }: { art: FreeArt; related: FreeArt[] }) {
  return (
    <>
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
                // Same card numbers as the /prints grid, sets included.
                const card = cardCommerce(item);
                return (
                  <div key={item.id} className="w-[70%] shrink-0 snap-start sm:w-auto">
                    <ArtCard
                      art={item}
                      href={card.href}
                      subtitle={item.category}
                      meta={card.meta}
                      value={card.value}
                      versions={card.versions}
                      versionNoun={card.versionNoun}
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
    </>
  );
}
