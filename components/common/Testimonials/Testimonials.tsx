import { Star } from "lucide-react";

import { REVIEWS, REVIEW_SUMMARY, type Review } from "@/config/reviews";

interface TestimonialsProps {
  reviews?: Review[];
  /** how many cards to show (default 3) */
  limit?: number;
  /** skip this many reviews first, so different pages show different quotes */
  offset?: number;
  heading?: string;
}

/**
 * Real buyer reviews (config/reviews.ts), three cards in a row.
 * No review structured data on purpose: self-serving review markup is against Google's guidelines.
 */
export default function Testimonials({
  reviews = REVIEWS,
  limit = 3,
  offset = 0,
  heading = "What buyers say",
}: TestimonialsProps) {
  const shown = reviews.slice(offset, offset + limit);
  if (shown.length === 0) return null;

  return (
    <section aria-labelledby="testimonials-heading">
      <div className="mb-8 text-center">
        <h2 id="testimonials-heading" className="text-[28px] font-semibold text-charcoal">
          {heading}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {REVIEW_SUMMARY.rating} stars from {REVIEW_SUMMARY.count} {REVIEW_SUMMARY.source}
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        {shown.map((r) => (
          <figure key={`${r.name}-${r.quote.slice(0, 24)}`} className="rounded-md border border-border bg-card p-5">
            <div className="flex gap-0.5" aria-label="5 out of 5 stars">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="size-4 fill-current text-sage-500" aria-hidden />
              ))}
            </div>
            <blockquote className="mt-3 text-sm leading-relaxed text-soft-charcoal">{r.quote}</blockquote>
            <figcaption className="mt-4">
              <span className="block text-sm font-semibold text-charcoal">{r.name}</span>
              {(r.product || r.date) && (
                <span className="block text-xs text-muted-foreground">
                  {[r.product, r.date].filter(Boolean).join(" · ")}
                </span>
              )}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
