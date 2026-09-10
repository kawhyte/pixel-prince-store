"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface ArtGallerySlide {
  url: string;
  alt: string;
}

interface ArtGalleryProps {
  images: ArtGallerySlide[];
  /** Fallback alt when a slide carries none. */
  title?: string;
  /** Aspect ratio class for the frame: the CLS guard. */
  aspectClass?: string;
  /**
   * Width / height of the main photo. When given it cuts the frame to that shape, so a photo fills
   * it edge to edge with no grey bars beside it and no crop. Falls back to `aspectClass`.
   */
  aspectRatio?: number;
  /** Desktop thumbnail placement: a row under the frame (default) or a vertical rail beside it (shop pages). */
  thumbs?: "bottom" | "left" | "center";
  /** White mat + wall shadow around the frame (shop pages hang the print on a wall). */
  frame?: boolean;
  /**
   * The `sizes` hint for the big slides. Give the real rendered width when the frame is capped:
   * a hint that is wider than the box makes the browser ask for pixels the source may not have,
   * and Next stops at the source width, so the picture is stretched instead of sharp.
   */
  sizes?: string;
}

export default function ArtGallery({
  images,
  title = "",
  aspectClass = "aspect-3/4",
  aspectRatio,
  thumbs = "bottom",
  frame = false,
  sizes = "(max-width: 1024px) 100vw, 50vw",
}: ArtGalleryProps) {
  const frameClass = frame
    ? "bg-white p-3 sm:p-4 wall-shadow"
    : "rounded-md bg-muted wall-shadow";
  // A measured ratio wins; the class stays the fallback so nothing loses its CLS guard.
  const ratioClass = aspectRatio ? "" : aspectClass;
  const ratioStyle = aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined;
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const scrollToSlide = useCallback((index: number) => {
    const track = trackRef.current;
    if (!track) return;
    const slide = track.children[index] as HTMLElement | undefined;
    if (slide) {
      track.scrollTo({ left: slide.offsetLeft, behavior: "smooth" });
    }
  }, []);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.clientWidth || 1;
    setActive(Math.round(track.scrollLeft / slideWidth));
  }, []);

  // Keep active dot in sync if the viewport resizes.
  useEffect(() => {
    onScroll();
  }, [onScroll]);

  // Single image: render exactly like the pre-carousel markup, no chrome.
  if (images.length === 1) {
    const only = images[0];
    return (
      <div className={frame ? frameClass : undefined}>
      <div
        className={`relative ${ratioClass} overflow-hidden ${frame ? "bg-muted" : frameClass}`}
        style={ratioStyle}
      >
        <Image
          src={only.url}
          alt={only.alt || title}
          fill
          className="object-contain"
          sizes={sizes}
          priority
        />
      </div>
      </div>
    );
  }

  const total = images.length;
  const go = (dir: -1 | 1) =>
    scrollToSlide(Math.min(Math.max(active + dir, 0), total - 1));

  const leftRail = thumbs === "left";

  return (
    <div className={leftRail ? "space-y-3 md:flex md:flex-row-reverse md:gap-4 md:space-y-0" : "space-y-3"}>
      <div className={frame ? `${frameClass} ${leftRail ? "md:min-w-0 md:flex-1" : ""}` : leftRail ? "md:min-w-0 md:flex-1" : undefined}>
      <div
        className={`group relative ${ratioClass} overflow-hidden ${frame ? "bg-muted" : frameClass}`}
        style={ratioStyle}
      >
        <div
          ref={trackRef}
          onScroll={onScroll}
          role="group"
          aria-roledescription="carousel"
          className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {images.map((img, i) => (
            <div
              key={`${img.url}-${i}`}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${total}`}
              className="relative h-full w-full shrink-0 snap-center"
            >
              <Image
                src={img.url}
                alt={img.alt || title}
                fill
                className="object-contain"
                sizes={sizes}
                priority={i === 0}
                loading={i === 0 ? undefined : "lazy"}
              />
            </div>
          ))}
        </div>

        {/* Desktop chevrons: hidden on touch */}
        <button
          type="button"
          aria-label="Previous photo"
          onClick={() => go(-1)}
          disabled={active === 0}
          className="absolute left-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 p-2 text-charcoal shadow-md transition hover:bg-cream disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          aria-label="Next photo"
          onClick={() => go(1)}
          disabled={active === total - 1}
          className="absolute right-3 top-1/2 hidden -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 p-2 text-charcoal shadow-md transition hover:bg-cream disabled:pointer-events-none disabled:opacity-0 md:flex"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      </div>

      {/* Dots: mobile (44px tall hit area, small visual dot) */}
      <div className="-my-3 flex justify-center gap-1 md:hidden">
        {images.map((_, i) => (
          <button
            type="button"
            key={i}
            aria-label={`Go to photo ${i + 1}`}
            aria-current={i === active}
            onClick={() => scrollToSlide(i)}
            className="flex h-11 items-center px-1"
          >
            <span
              className={`h-2 rounded-full transition-all ${
                i === active ? "w-6 bg-sage-500" : "w-2 bg-sage-200"
              }`}
            />
          </button>
        ))}
      </div>

      {/* Thumbnails: desktop */}
      <div
        className={`hidden gap-3 md:flex ${
          leftRail
            ? "md:w-[76px] md:shrink-0 md:flex-col md:overflow-y-auto"
            : `overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${thumbs === "center" ? "justify-center" : ""}`
        }`}
      >
        {images.map((img, i) => (
          <button
            type="button"
            key={`${img.url}-thumb-${i}`}
            aria-label={`Go to photo ${i + 1}`}
            aria-current={i === active}
            onClick={() => scrollToSlide(i)}
            className={`relative shrink-0 overflow-hidden rounded-md border-2 transition ${
              leftRail ? "aspect-[4/5] w-full" : "aspect-square w-16"
            } ${
              i === active
                ? leftRail ? "border-charcoal" : "border-sage-500"
                : leftRail ? "border-border opacity-80 hover:opacity-100" : "border-transparent opacity-70 hover:opacity-100"
            }`}
          >
            <Image
              src={img.url}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
            />
          </button>
        ))}
      </div>
    </div>
  );
}
