import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight, Truck, Clock, ShieldCheck, Star, PenTool, Layers, Heart } from "lucide-react";

import ShopHero from "@/components/common/ShopHero/ShopHero";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import Testimonials from "@/components/common/Testimonials/Testimonials";
import EmailSignupForm from "@/components/common/EmailSignupForm/EmailSignupForm";
import { getAllProducts, getShopPrints } from "@/sanity/lib/client";
import { COLLECTIONS, matchProductsToCollection } from "@/config/collections";
import { cardCommerce, isNewPrint } from "@/lib/commerce";
import { HOME_BAND, HOME_CALLOUTS, HOME_FREE, HOME_SEO, HOME_TRUST } from "@/config/home-copy";
import { SHOP_PROMO } from "@/config/shop-copy";

// Index-aligned with HOME_TRUST and HOME_CALLOUTS (config/home-copy.ts).
const TRUST_ICONS = [Truck, Clock, ShieldCheck, Star];
const CALLOUT_ICONS = [PenTool, Layers, Heart];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-500">{children}</p>;
}

/**
 * Homepage, shop-first (PLAN-44): hero, trust strip, best sellers, why us, collections,
 * reviews, the free-print section, sets band, SEO copy, email band.
 */
export default async function Home() {
  const [freePrints, shopPrints] = await Promise.all([getAllProducts(), getShopPrints()]);
  const bestSellers = [...shopPrints]
    .sort((a, b) => (b.sales ?? 0) - (a.sales ?? 0) || (b.createdAt > a.createdAt ? 1 : -1))
    .slice(0, 8);
  // The wall holds four. Shop prints lead and free prints top it up, so it never shows gaps.
  const heroItems = [...shopPrints, ...freePrints.filter((f) => !shopPrints.some((s) => s.id === f.id))].slice(0, 4);
  const freeRow = freePrints.slice(0, 12);

  // A tile shows a print from its own collection or nothing: borrowing an unrelated print
  // put the same image on all three tiles while the shop held one print.
  const usedTileImages = new Set<string>();
  const tiles = COLLECTIONS.flatMap((collection) => {
    const candidates = [...matchProductsToCollection(shopPrints, collection), ...matchProductsToCollection(freePrints, collection)];
    const match = candidates.find((c) => c.previewImage && !usedTileImages.has(c.previewImage));
    if (!match?.previewImage) return [];
    usedTileImages.add(match.previewImage);
    return [{ slug: collection.slug, label: collection.title, tagline: collection.tagline, image: match.previewImage }];
  });

  // Rows are built for four cards. With fewer, widen them instead of leaving holes.
  const rowClass = (count: number) =>
    count >= 4
      ? "mt-8 grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4"
      : count === 3
        ? "mt-8 grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-3"
        : count === 2
          ? "mt-8 grid max-w-3xl gap-6 sm:grid-cols-2 md:gap-8"
          : "mt-8 grid max-w-sm gap-6";

  return (
    <main className="min-h-screen">
      {SHOP_PROMO.enabled && (
        <div className="bg-charcoal py-2 text-center text-sm text-cream">
          <strong>{SHOP_PROMO.headline}</strong> {SHOP_PROMO.body}
        </div>
      )}

      {/* 1. Hero */}
      <ShopHero items={heroItems} />

      {/* 2. Trust strip */}
      <section className="border-b border-border bg-card py-7">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-y-6 text-center sm:grid-cols-4 sm:gap-y-0">
            {HOME_TRUST.map((t, i) => {
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

      {/* 3. Best sellers */}
      <section className="container mx-auto px-4 py-14 lg:py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <Eyebrow>Best sellers</Eyebrow>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-charcoal">Prints people hang first</h2>
          </div>
          <Link href="/prints" className="hidden items-center gap-1 text-sm font-semibold text-sage-500 hover:text-sage-400 sm:inline-flex">
            Shop all prints <ArrowRight className="size-4" />
          </Link>
        </div>
        <p className="mt-2 max-w-2xl text-soft-charcoal">{bestSellers.length > 1 ? "The ones that leave the studio most often." : "The first of the printed range, with more landing every week."}</p>
        {bestSellers.length === 0 ? (
          <div className="mt-8 rounded-md border border-border bg-card p-10 text-center">
            <p className="text-lg text-charcoal">The first printed prints are arriving soon.</p>
            <p className="mt-2 text-sm text-soft-charcoal">Until then, every print in the free library costs nothing.</p>
          </div>
        ) : (
          <div className={rowClass(bestSellers.length)}>
            {bestSellers.map((art) => {
              const card = cardCommerce(art);
              return (
                <ArtCard
                  key={art.id}
                  art={art}
                  href={card.href}
                  subtitle={art.category}
                  meta={card.meta}
                  value={card.value}
                  badge={isNewPrint(art.createdAt) ? "New" : undefined}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              );
            })}
          </div>
        )}
        <div className="mt-10 text-center sm:hidden">
          <Link href="/prints" className="inline-flex h-12 items-center rounded-md bg-charcoal px-8 font-semibold text-white">
            Shop all prints
          </Link>
        </div>
      </section>

      {/* 4. Why us */}
      <section className="border-y border-border bg-card py-12">
        <div className="container mx-auto grid gap-8 px-4 sm:grid-cols-3">
          {HOME_CALLOUTS.map((c, i) => {
            const Icon = CALLOUT_ICONS[i];
            return (
              <div key={c.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-sage-50 text-sage-500">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <h3 className="font-semibold text-charcoal">{c.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-soft-charcoal">{c.body}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. Collections */}
      {tiles.length > 1 && (
      <section className="py-14 lg:py-20">
        <div className="container mx-auto px-4">
          <Eyebrow>Explore</Eyebrow>
          <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-charcoal">Find your wall</h2>
          <p className="mt-2 max-w-2xl text-soft-charcoal">Browse by the room it is going in, or the thing you love.</p>
        </div>
        <div className="mt-8 flex snap-x gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] lg:container lg:mx-auto [&::-webkit-scrollbar]:hidden">
          {tiles.map((tile) => (
            <Link
              key={tile.slug}
              href={`/collections/${tile.slug}`}
              className="group relative block w-[270px] shrink-0 snap-start overflow-hidden rounded-md shadow-card transition-shadow duration-200 hover:shadow-card-hover sm:w-[300px]"
            >
              <div className="relative aspect-[4/5] bg-muted">
                <Image
                  src={tile.image}
                  alt={tile.label}
                  fill
                  sizes="300px"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.45)_16%,rgba(0,0,0,0)_38%)]" />
              </div>
              <div className="absolute inset-x-0 bottom-0 p-3">
                <span className="inline-block bg-white px-2 py-1 text-xs font-bold uppercase tracking-wide text-charcoal">
                  {tile.label}
                </span>
                <p className="mt-1.5 flex items-start gap-1 text-[13px] leading-snug text-white">
                  {tile.tagline}
                  <ChevronRight className="mt-0.5 size-3.5 shrink-0" />
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {/* 6. Reviews */}
      <section className="border-y border-border bg-card py-14 lg:py-20">
        <div className="container mx-auto px-4">
          <Testimonials />
        </div>
      </section>

      {/* 7. Free prints */}
      <section className="container mx-auto px-4 py-14 lg:py-20">
        <div className="flex items-end justify-between gap-6">
          <div>
            <Eyebrow>{HOME_FREE.eyebrow}</Eyebrow>
            <h2 className="mt-2 text-[28px] font-semibold tracking-tight text-charcoal">{HOME_FREE.headline}</h2>
            <p className="mt-2 max-w-2xl text-soft-charcoal">{HOME_FREE.body}</p>
          </div>
          <Link href="/free-downloads" className="hidden items-center gap-1 text-sm font-semibold text-sage-500 hover:text-sage-400 sm:inline-flex">
            {HOME_FREE.cta} <ArrowRight className="size-4" />
          </Link>
        </div>
        {freeRow.length > 0 && (
          <div className="-mx-4 mt-8 flex snap-x gap-5 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {freeRow.map((art) => (
              <div key={art.id} className="w-[250px] shrink-0 snap-start sm:w-[270px]">
                <ArtCard art={art} href={`/art/${art.id}`} subtitle={art.category} sizes="270px" />
              </div>
            ))}
          </div>
        )}
        <div className="mt-10 text-center sm:hidden">
          <Link href="/free-downloads" className="inline-flex h-12 items-center rounded-md border border-charcoal px-8 font-semibold text-charcoal">
            {HOME_FREE.cta}
          </Link>
        </div>
      </section>

      {/* 8. Sets band */}
      <section className="bg-charcoal py-16 text-cream">
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-300">{HOME_BAND.eyebrow}</p>
          <h2 className="mt-3 text-[28px] font-semibold tracking-tight sm:text-[34px]">{HOME_BAND.headline}</h2>
          <p className="mx-auto mt-3 max-w-xl text-cream/70">{HOME_BAND.body}</p>
          <Link
            href={HOME_BAND.href}
            className="mt-7 inline-flex h-12 items-center rounded-md bg-sage-500 px-8 font-semibold text-white transition-colors hover:bg-sage-400"
          >
            {HOME_BAND.cta}
          </Link>
        </div>
      </section>

      {/* 9. SEO copy */}
      <section className="container mx-auto px-4 py-14 lg:py-20">
        <h2 className="text-2xl font-semibold tracking-tight text-charcoal">{HOME_SEO.headline}</h2>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {HOME_SEO.columns.map((c) => (
            <div key={c.title}>
              <h3 className="font-semibold text-charcoal">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-soft-charcoal">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 10. Email band */}
      <section className="border-t border-border bg-sage-50 py-14">
        <div className="container mx-auto flex flex-col gap-6 px-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-charcoal">Get a new free print every month</h2>
            <p className="mt-1 text-sm text-soft-charcoal">One email a month, plus what is new in the shop. Unsubscribe anytime.</p>
          </div>
          <EmailSignupForm source="home-band" className="w-full max-w-xl" />
        </div>
      </section>
    </main>
  );
}
