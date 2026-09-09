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
}: ArtCardProps) {
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
          <h3 className="truncate text-base font-medium text-charcoal">{art.title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs uppercase tracking-wide text-muted-foreground">
              {subtitle}
            </p>
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
