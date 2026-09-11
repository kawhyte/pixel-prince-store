import Image from "next/image";
import Link from "next/link";

import { getGridCardAspectClass } from "@/lib/image-utils";
import type { ImageOrientation } from "@/lib/image-utils";

/**
 * ArtCard: the single Juniqe-style gallery card used across home, free-downloads,
 * collections, and the related grid (PLAN-14 Phase C, PLAN-22 anatomy v2).
 *
 * Full-bleed artwork at a fixed aspect (no colored mats), a one-line truncated
 * title and quiet category below, one <Link> wrapping the card body.
 * Optional `footer` renders a sibling interactive slot OUTSIDE the link
 * (e.g. a secondary link) so we never nest anchors.
 */

/** Minimal art shape every caller can satisfy. */
export interface ArtCardArt {
  title: string;
  previewImage: string;
  previewImageOrientation?: ImageOrientation;
  /** the single schema-enforced hero print: draws a notched "Featured" tab. */
  featured?: boolean;
}

export interface ArtCardProps {
  art: ArtCardArt;
  href: string;
  /** next/image sizes attr: required; callers pass values matching their grid. */
  sizes: string;
  /** quiet subtitle line under the title (e.g. category). */
  subtitle?: string;
  /** small chip over the image's top-left (Juniqe-style). */
  badge?: string;
  /** value shown in the price slot (bottom-right of the divided row). "" hides the row. */
  value?: string;
  /** medium label on the left of the divided value row. */
  meta?: string;
  /** interactive slot rendered below the card body, outside the link. */
  footer?: React.ReactNode;
  /**
   * The versions this print is sold in, for the swatch row. Shown only when there is more than
   * one, because "1 version" tells a shopper nothing. Not interactive: the card is one link, and
   * a clickable swatch inside it would be an anchor inside an anchor.
   */
  versions?: { label: string; imageUrl?: string }[];
  /** what a version is called in the shop's own words, e.g. "Version" -> "2 versions". */
  versionNoun?: string;
}

export default function ArtCard({
  art,
  href,
  sizes,
  subtitle,
  badge,
  value = "FREE",
  meta = "Digital print",
  footer,
  versions,
  versionNoun = "version",
}: ArtCardProps) {
  const swatches = versions && versions.length > 1 ? versions : undefined;
  const aspectClass = art.previewImageOrientation
    ? getGridCardAspectClass(art.previewImageOrientation.orientation)
    : "aspect-[2/3]";

  return (
    <div className="group min-w-0">
      <Link
        href={href}
        className="block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sage-500 focus-visible:ring-offset-2"
      >
        <div
          className={`relative ${aspectClass} overflow-hidden rounded-md bg-muted shadow-card transition-shadow duration-200 group-hover:shadow-card-hover`}
        >
          <Image
            src={art.previewImage}
            alt={art.title}
            fill
            className="object-cover transition-transform duration-200 group-hover:scale-[1.03]"
            sizes={sizes}
          />
          {art.featured && (
            <span
              className="absolute left-0 top-3 bg-sage-500 py-1 pl-3 pr-4 text-[11px] font-semibold uppercase tracking-wide text-white shadow-card"
              style={{ clipPath: "polygon(0 0, 100% 0, calc(100% - 9px) 50%, 100% 100%, 0 100%)" }}
            >
              Featured
            </span>
          )}
          {badge && (
            <span className="absolute right-2 top-2 rounded-md bg-sage-500 px-2.5 py-1 text-xs font-medium text-white">
              {badge}
            </span>
          )}
        </div>
        <div className="pt-3">
          {/* Two lines, and always the height of two. One line cut 5 of 6 titles on desktop, most of
              them by under 100px, so a second line holds all of them. Reserving the height even for
              a one-line title is what keeps the price rows level across a row of cards; clamping
              alone would leave them stepped. */}
          <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-medium leading-snug text-charcoal">{art.title}</h3>
          {/* Always rendered, even with nothing to say. One print has no category, and dropping the
              line left its card 18px short, which knocked the price row out of line with the rest
              of the row. Hidden from screen readers when it is only holding space. */}
          <p
            className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground"
            aria-hidden={!subtitle}
          >
            {subtitle || "\u00A0"}
          </p>
          {swatches && (
            <div className="mt-1.5 flex items-center gap-2">
              <span className="flex -space-x-1">
                {swatches.slice(0, 4).map((v) => (
                  <span
                    key={v.label}
                    className="relative size-4 overflow-hidden rounded-full border border-cream bg-muted ring-1 ring-border"
                  >
                    {/* 32 rather than 16: the swatch is 16 css px, and a 2x screen wants twice that */}
                    {v.imageUrl && <Image src={v.imageUrl} alt="" fill className="object-cover" sizes="32px" />}
                  </span>
                ))}
              </span>
              <span className="text-xs text-muted-foreground">
                {swatches.length} {versionNoun.toLowerCase()}s
              </span>
            </div>
          )}
          {value && (
            <div className="mt-2 flex items-center justify-between border-t border-border pt-2">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">{meta}</span>
              <span className="text-sm font-semibold text-charcoal">{value}</span>
            </div>
          )}
        </div>
      </Link>
      {footer && <div className="pt-2">{footer}</div>}
    </div>
  );
}
