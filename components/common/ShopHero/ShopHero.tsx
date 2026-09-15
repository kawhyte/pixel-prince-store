import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";

import type { FreeArt } from "@/sanity/lib/client";
import { cardCommerce } from "@/lib/commerce";
import { HOME_HERO } from "@/config/home-copy";
import { REVIEW_SUMMARY } from "@/config/reviews";

interface ShopHeroProps {
  /** shop prints first; falls back to free prints when the shop is empty */
  items: FreeArt[];
}

/**
 * How many prints the hero wall shows. Exported so the page feeding it cannot pick a different
 * number: it used to slice to four in two files, and the wall silently followed whichever was
 * smaller.
 */
export const HERO_WALL_COUNT = 2;

/**
 * The prints to hang, preferring one per category.
 *
 * Straight "newest first" put the retro controllers next to the retro consoles: same palette,
 * same grid, same beige, and side by side they read as one picture cut in half. Two prints have
 * to carry the whole hero, so they need to look like two things. Falls back to plain order once
 * the categories run out, and never drops an item to satisfy the rule.
 */
export function pickHeroWall<T extends { category?: string }>(items: T[], count = HERO_WALL_COUNT): T[] {
  const picked: T[] = [];
  const used = new Set<string>();
  const remaining = [...items];
  while (picked.length < count && remaining.length > 0) {
    const i = remaining.findIndex((x) => !used.has((x.category ?? "").toLowerCase()));
    const take = i >= 0 ? i : 0;
    const [item] = remaining.splice(take, 1);
    picked.push(item);
    used.add((item.category ?? "").toLowerCase());
  }
  return picked;
}

/**
 * Shop-first hero (PLAN-44): a wall of prints on the left, the offer and one primary CTA on the
 * right. Free prints are the secondary link by decision.
 *
 * Two prints, not four (Kenny, 2026-09-15). The grid is two columns either way, so this is one
 * row rather than two and the images are the same width; what changes is that the hero stops
 * competing with the best-sellers grid directly under it.
 */
export default function ShopHero({ items }: ShopHeroProps) {
  const wall = pickHeroWall(items, HERO_WALL_COUNT);
  // one print fills the panel rather than sitting in half an empty grid
  const single = wall.length === 1;

  return (
    <section className="border-b border-border">
      <div className="container mx-auto grid gap-10 px-4 py-10 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16 lg:py-16">
        {/* The wall */}
        <div className="wall-band order-2 rounded-md p-6 sm:p-10 lg:order-1">
          {wall.length > 0 ? (
            <div className={single ? "" : "grid grid-cols-2 gap-5 sm:gap-8"}>
              {wall.map((item, i) => {
                const card = cardCommerce(item);
                return (
                  <Link
                    key={item.id}
                    href={card.href}
                    // No card background and no box shadow. Three of these previews are transparent
                    // PNGs, so a background was showing through as a white panel and the shadow was
                    // outlining a box nobody could see. Left bare, each print sits straight on the
                    // wall, and the drop shadow already drawn into the mockups does the rest.
                    className={`group block self-start transition-transform duration-200 hover:-translate-y-0.5 ${
                      !single && i % 2 === 1 ? "mt-6 sm:mt-10" : ""
                    }`}
                  >
                    {/* heroImage is already cropped to this box's 4:5 by Sanity, honouring the
                        hotspot set in Studio, so every print is the same shape and cover cuts
                        nothing. The previews themselves are a mix of square, portrait and landscape;
                        cropping them here rather than at render is what Juniqe does and is the only
                        thing that makes a row of them look deliberate. Falls back to the raw preview
                        for anything that has not been through the pipeline. */}
                    <div className="relative aspect-[4/5] overflow-hidden">
                      <Image
                        src={item.heroImage || item.previewImage}
                        alt={item.title}
                        fill
                        priority
                        sizes={single ? "(max-width: 1024px) 90vw, 45vw" : "(max-width: 1024px) 45vw, 25vw"}
                        className="object-cover"
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-sm text-muted-foreground">
              Prints arriving soon
            </div>
          )}
        </div>

        {/* The offer */}
        <div className="order-1 space-y-6 lg:order-2">
          <div className="flex items-center gap-2">
            <span className="flex gap-0.5" aria-label={`${REVIEW_SUMMARY.rating} out of 5 stars`}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current text-sage-500" aria-hidden />
              ))}
            </span>
            <span className="text-sm text-soft-charcoal">
              {REVIEW_SUMMARY.rating} · {REVIEW_SUMMARY.count} {REVIEW_SUMMARY.source}
            </span>
          </div>
          <h1 className="text-[40px] font-bold leading-[1.1] tracking-tight text-charcoal sm:text-5xl lg:text-[56px]">
            {HOME_HERO.headline}
          </h1>
          <p className="max-w-lg text-lg text-soft-charcoal">{HOME_HERO.sub}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/prints"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-charcoal px-8 text-base font-semibold text-white transition-colors hover:bg-soft-charcoal"
            >
              {HOME_HERO.cta}
              <ArrowRight className="size-5" />
            </Link>
            <Link
              href="/free-downloads"
              className="inline-flex h-12 items-center justify-center text-sm font-medium text-sage-500 transition-colors hover:text-sage-400 sm:px-2"
            >
              {HOME_HERO.secondary}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
