"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

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
  /** next/image quality for the big slides. Shop pages pass 90: the default 75 softens map detail. */
  quality?: number;
  /** Tap a slide to open it full screen at its original size (shop pages). */
  zoom?: boolean;
  /**
   * Desktop thumbnail shape for the bottom row. Shown whole (object-contain), so a 4:3 mockup in a
   * 4:3 box is not cropped. Leave unset for the square, cropped thumbs.
   */
  thumbAspect?: string;
}

/**
 * Full-screen view of one slide. It loads the original file, unoptimized, and sizes it to its own
 * pixels capped by the viewport, so it is never upscaled and never stretched.
 */
function Lightbox({
  images,
  index,
  title,
  onIndexChange,
  onClose,
}: {
  images: ArtGallerySlide[];
  index: number | null;
  title: string;
  onIndexChange: (i: number) => void;
  onClose: () => void;
}) {
  const img = index === null ? null : images[index];
  const total = images.length;
  return (
    <Dialog open={img !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className="flex h-[100dvh] max-w-none items-center justify-center rounded-none border-0 bg-charcoal/95 p-4 text-cream sm:max-w-none sm:p-10 [&>button]:text-cream"
        onKeyDown={(e) => {
          if (index === null) return;
          if (e.key === "ArrowLeft" && index > 0) onIndexChange(index - 1);
          if (e.key === "ArrowRight" && index < total - 1) onIndexChange(index + 1);
        }}
      >
        <DialogTitle className="sr-only">{img?.alt || title}</DialogTitle>
        {img && (
          <Image
            key={img.url}
            src={img.url}
            alt={img.alt || title}
            width={3000}
            height={2250}
            unoptimized
            className="h-auto max-h-full w-auto max-w-full object-contain"
          />
        )}
        {index !== null && total > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous photo"
              onClick={() => onIndexChange(index - 1)}
              disabled={index === 0}
              className="absolute left-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 p-2 text-charcoal shadow-md transition hover:bg-cream disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Next photo"
              onClick={() => onIndexChange(index + 1)}
              disabled={index === total - 1}
              className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full bg-cream/90 p-2 text-charcoal shadow-md transition hover:bg-cream disabled:pointer-events-none disabled:opacity-0"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** A tappable layer over a slide that opens the lightbox. */
function ZoomButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Zoom: ${label}`}
      onClick={onClick}
      className="absolute inset-0 cursor-zoom-in focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-sage-500"
    >
      <span className="absolute bottom-3 right-3 flex items-center justify-center rounded-full bg-cream/90 p-2 text-charcoal shadow-md">
        <ZoomIn className="h-4 w-4" aria-hidden />
      </span>
    </button>
  );
}

export default function ArtGallery({
  images,
  title = "",
  aspectClass = "aspect-3/4",
  aspectRatio,
  thumbs = "bottom",
  frame = false,
  sizes = "(max-width: 1024px) 100vw, 50vw",
  quality,
  zoom = false,
  thumbAspect,
}: ArtGalleryProps) {
  const frameClass = frame
    ? "bg-white p-3 sm:p-4 wall-shadow"
    : "rounded-md bg-muted wall-shadow";
  // A measured ratio wins; the class stays the fallback so nothing loses its CLS guard.
  const ratioClass = aspectRatio ? "" : aspectClass;
  const ratioStyle = aspectRatio ? { aspectRatio: String(aspectRatio) } : undefined;
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [zoomed, setZoomed] = useState<number | null>(null);
  const lightbox = zoom ? (
    <Lightbox images={images} index={zoomed} title={title} onIndexChange={setZoomed} onClose={() => setZoomed(null)} />
  ) : null;

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
          quality={quality}
          preload
        />
        {zoom && <ZoomButton label={only.alt || title} onClick={() => setZoomed(0)} />}
      </div>
      {lightbox}
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
                quality={quality}
                preload={i === 0}
                loading={i === 0 ? undefined : "lazy"}
              />
              {zoom && <ZoomButton label={img.alt || title} onClick={() => setZoomed(i)} />}
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
              leftRail ? "aspect-[4/5] w-full" : thumbAspect ? `${thumbAspect} bg-muted` : "aspect-square w-16"
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
              className={thumbAspect && !leftRail ? "object-contain" : "object-cover"}
              sizes={thumbAspect && !leftRail ? "160px" : "64px"}
            />
          </button>
        ))}
      </div>
      {lightbox}
    </div>
  );
}
