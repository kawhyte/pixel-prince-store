import Link from "next/link";
import Image from "next/image";
import { ChevronRight, PenTool, CalendarDays, Download, Star } from "lucide-react";

import Hero from "@/components/ui/Hero/Hero";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import { getAllProducts, getFeaturedProduct, getShopPrints } from "@/sanity/lib/client";
import { cardCommerce } from "@/lib/commerce";
import { COLLECTIONS, matchProductsToCollection } from "@/config/collections";
import { TRUST_CLAIMS } from "@/config/trust";
import Testimonials from "@/components/common/Testimonials/Testimonials";

const TILE_SLUGS = [
  { slug: "game-room-wall-art", label: "Game Room Wall Art" },
  { slug: "map-prints", label: "Map Prints" },
  { slug: "printable-wall-art", label: "Printable Bundles" },
];

// Index-aligned with TRUST_CLAIMS order (config/trust.ts).
const TRUST_ICONS = [PenTool, CalendarDays, Download, Star];

export default async function Home() {
  const [products, shopPrints] = await Promise.all([getAllProducts(), getShopPrints()]);
  const featured = (await getFeaturedProduct()) ?? products[0] ?? null;
  const bandPrints = shopPrints.slice(0, 4);
  const heroItems = [
    featured,
    ...products.filter((p) => p.id !== featured?.id),
  ]
    .filter((p): p is NonNullable<typeof p> => p != null)
    .slice(0, 2);
  const gridProducts = products.slice(0, 8);

  const tiles = TILE_SLUGS.map(({ slug, label }) => {
    const collection = COLLECTIONS.find((c) => c.slug === slug)!;
    const match = matchProductsToCollection(products, collection)[0];
    const image = match?.previewImage ?? featured?.previewImage ?? null;
    return { slug, label, image };
  });

  return (
    <main className="min-h-screen">
      {/* 1. Hero */}
      <Hero items={heroItems} />

      {/* 2. Trust strip */}
      <section className="border-y border-border bg-card py-8">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-y-8 text-center sm:grid-cols-4 sm:gap-y-0">
            {TRUST_CLAIMS.map((claim, i) => {
              const Icon = TRUST_ICONS[i];
              return (
                <div
                  key={claim.label}
                  className={`flex flex-col items-center gap-2 px-4 ${
                    i > 0 ? "sm:border-l sm:border-border" : ""
                  }`}
                >
                  <Icon className="size-5 text-charcoal" aria-hidden />
                  <p className="text-sm font-semibold text-charcoal">{claim.label}</p>
                  <p className="text-xs text-muted-foreground">{claim.sub}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 3. Free collection grid */}
      <section className="py-14 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-[28px] font-semibold text-charcoal">
              Browse the free prints
            </h2>
          </div>

          {gridProducts.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center">
              <p className="text-lg text-muted-foreground">
                No free art available yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
              {gridProducts.map((art) => (
                <ArtCard
                  key={art.id}
                  art={art}
                  href={`/art/${art.id}`}
                  subtitle={art.category}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                />
              ))}
            </div>
          )}

          <div className="mt-16 text-center">
            <Link
              href="/free-downloads"
              className="inline-flex h-12 items-center rounded-md border border-charcoal px-8 font-semibold text-charcoal transition-colors hover:bg-charcoal hover:text-cream"
            >
              See all free prints
            </Link>
          </div>
        </div>
      </section>

      {/* 4. Collection tiles */}
      <section className="py-14 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-[28px] font-semibold text-charcoal">
              Find your wall
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {tiles.map((tile) => (
              <Link
                key={tile.slug}
                href={`/collections/${tile.slug}`}
                className="group relative block aspect-[4/3] overflow-hidden rounded-md shadow-card transition-shadow duration-200 hover:shadow-card-hover"
              >
                {tile.image ? (
                  <Image
                    src={tile.image}
                    alt={tile.label}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 bg-secondary" />
                )}
                <div className="absolute inset-x-0 bottom-0 bg-white/95 px-4 py-3">
                  <p className="truncate text-sm font-medium text-charcoal">
                    {tile.label}
                  </p>
                  <span className="mt-0.5 flex items-center text-sm font-semibold text-sage-500">
                    Discover
                    <ChevronRight className="size-4" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. About teaser */}
      <section className="bg-card py-14 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto flex max-w-3xl flex-col items-center gap-6 text-center sm:flex-row sm:text-left">
            <div className="flex flex-shrink-0 gap-3">
              <Image
                src="/about/avatar_mr.png"
                alt="Kenny"
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
              <Image
                src="/about/avatar_mrs.png"
                alt="Rene"
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
            </div>
            <div className="space-y-3">
              <p className="text-base leading-relaxed text-soft-charcoal sm:text-lg">
                We are Kenny and Rene. We design every piece ourselves, inspired
                by the places we have traveled.
              </p>
              <Link
                href="/about"
                className="inline-block text-sm font-medium text-sage-500 transition-colors hover:text-sage-400"
              >
                More about us
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Shop band */}
      <section className="py-14 lg:py-24">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-[28px] font-semibold text-charcoal">
              Printed and shipped to you
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-soft-charcoal">
              {bandPrints.length > 0
                ? "Printed to order on matte paper, free US shipping."
                : "The first printed prints are arriving soon."}
            </p>
          </div>

          {bandPrints.length > 0 && (
            <div className="grid gap-6 sm:grid-cols-2 md:gap-8 lg:grid-cols-4">
              {bandPrints.map((art) => {
                const card = cardCommerce(art);
                return (
                  <ArtCard
                    key={art.id}
                    art={art}
                    href={card.href}
                    subtitle={art.category}
                    meta={card.meta}
                    value={card.value}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                );
              })}
            </div>
          )}

          <div className={`text-center ${bandPrints.length > 0 ? "mt-16" : ""}`}>
            <Link
              href="/prints"
              className="inline-flex h-12 items-center rounded-md bg-sage-500 px-8 font-semibold text-white transition-colors hover:bg-sage-400"
            >
              See all prints
            </Link>
          </div>
        </div>
      </section>

      {/* 7. Reviews */}
      <section className="bg-card py-14 lg:py-24">
        <div className="container mx-auto px-4">
          <Testimonials />
        </div>
      </section>
    </main>
  );
}
