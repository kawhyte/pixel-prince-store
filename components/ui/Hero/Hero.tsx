import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronRight } from "lucide-react";
import EmailSignupForm from "@/components/common/EmailSignupForm/EmailSignupForm";
import { FreeArt } from "@/sanity/lib/client";

interface HeroProps {
  items: FreeArt[];
}

/**
 * HeroCard: one collage card. If the product has a room/lifestyle mockup
 * (galleryImages), render it full-bleed like Juniqe. Otherwise the flat poster
 * is matted inside a white frame on a wall-tone background so it reads as
 * framed wall art instead of a poster floating in empty space.
 */
function HeroCard({ item, featured }: { item: FreeArt; featured?: boolean }) {
  const mockup = item.galleryImages?.[0]?.url;

  return (
    <Link
      href={`/art/${item.id}`}
      className="group relative block aspect-[3/4] overflow-hidden rounded-md shadow-card transition-shadow duration-200 hover:shadow-card-hover"
    >
      {mockup ? (
        <Image
          src={mockup}
          alt={item.galleryImages?.[0]?.alt || item.title}
          fill
          priority={featured}
          sizes="(max-width: 768px) 50vw, 25vw"
          className="object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary p-4 lg:p-5">
          <div className="relative aspect-[4/5] w-full border border-charcoal/15 bg-white p-2">
            <Image
              src={item.previewImage}
              alt={item.title}
              fill
              priority={featured}
              sizes="(max-width: 768px) 50vw, 25vw"
              className="object-contain"
            />
          </div>
        </div>
      )}

      {featured && (
        <span
          className="absolute left-0 top-4 bg-sage-500 py-1 pl-3 pr-5 text-[11px] font-semibold uppercase tracking-wide text-white shadow-sm"
          style={{
            clipPath: "polygon(0 0, 100% 0, calc(100% - 8px) 50%, 100% 100%, 0 100%)",
          }}
        >
          Featured
        </span>
      )}

      <div className="absolute inset-x-0 bottom-0 bg-white/95 px-3 py-2">
        <p className="truncate text-xs font-medium text-charcoal">{item.title}</p>
        <span className="mt-0.5 flex items-center text-xs font-semibold text-sage-500">
          Get it free
          <ChevronRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

export default function Hero({ items }: HeroProps) {
  const [first, second] = items;

  return (
    <section className="relative overflow-hidden bg-cream py-14 lg:py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
          {/* Left: Text Content */}
          <div className="space-y-8">
            <h1 className="text-[40px] leading-[1.15] font-bold text-charcoal sm:text-5xl lg:text-6xl">
               Art for your walls. Free, monthly.
            </h1>

            <p className="text-lg text-soft-charcoal">
              Retro gaming and map art, designed by humans. Pick a print and it
              lands in your inbox.
            </p>

            <div className="space-y-3">
              <EmailSignupForm source="home-hero" />
              <Link
                href="/free-downloads"
                className="inline-flex items-center gap-1 text-sm font-medium text-sage-500 transition-colors hover:text-sage-400"
              >
                Or just browse the free prints
                <ArrowRight className="size-4" />
              </Link>
            </div>
          </div>

          {/* Right: Two featured cards, side by side */}
          {items.length > 0 && (
            <div className="grid grid-cols-2 gap-4 lg:gap-5">
              {first && <HeroCard item={first} featured />}
              {second && <HeroCard item={second} />}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
