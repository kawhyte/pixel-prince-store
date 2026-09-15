"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import type { FreeArt } from "@/sanity/lib/client";
import { cardCommerce } from "@/lib/commerce";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import { cn } from "@/lib/utils";
import { gridClass, gridSizes } from "@/lib/grid";

interface PrintsGridClientProps {
  prints: FreeArt[];
  /**
   * Which prints wear the "New" ribbon, decided by the server.
   *
   * This grid renders on the server and again in the browser. It used to ask `isNewPrint`, which
   * reads `Date.now()`, so the two renders consulted different clocks; the page is cached, so a
   * print sitting on the 30 day boundary got a ribbon in the HTML that hydration then removed.
   * Taking the answer as a prop leaves nothing here for a clock to change.
   */
  newIds: string[];
}

const ALL = "All prints";
const subscribeNoop = () => () => {};
const SETS = "Sets";

/** Category chips + card grid for /prints (PLAN-43). Filters the already-fetched list, no refetch. */
export default function PrintsGridClient({ prints, newIds }: PrintsGridClientProps) {
  const isNew = useMemo(() => new Set(newIds), [newIds]);
  const categories = useMemo(() => {
    const seen = new Set<string>();
    for (const p of prints) {
      const c = p.category?.trim();
      if (c) seen.add(c);
    }
    const list = [ALL, ...Array.from(seen)];
    if (prints.some((p) => p.kind === "set")) list.push(SETS);
    return list;
  }, [prints]);
  // URL filter (?category= / ?kind=set) read as an external store: the server renders the full
  // grid (SEO), the client picks up the filter after hydration without a setState-in-effect.
  const search = useSyncExternalStore(subscribeNoop, () => window.location.search, () => "");
  const params = new URLSearchParams(search);
  const fromUrl = params.get("kind") === "set" ? SETS : params.get("category");
  const [picked, setPicked] = useState<string | null>(null);
  const active = picked ?? (fromUrl && categories.includes(fromUrl) ? fromUrl : ALL);
  const setActive = setPicked;
  const shown =
    active === ALL ? prints : active === SETS ? prints.filter((p) => p.kind === "set") : prints.filter((p) => p.category?.trim() === active);

  return (
    <div className="mt-10">
      {categories.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              aria-pressed={active === c}
              className={cn(
                "inline-flex h-11 items-center rounded-full border px-4 text-sm font-medium transition-colors",
                active === c
                  ? "border-charcoal bg-charcoal text-white"
                  : "border-border bg-card text-charcoal hover:border-charcoal",
              )}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className={`mt-8 ${gridClass(shown.length)}`}>
        {shown.map((art) => {
          const card = cardCommerce(art);
          return (
            <ArtCard
              key={art.id}
              art={art}
              href={card.href}
              subtitle={art.category}
              meta={card.meta}
              value={card.value}
              badge={isNew.has(art.id) ? "New" : undefined}
              versions={card.versions}
              versionNoun={card.versionNoun}
              sizes={gridSizes(shown.length)}
            />
          );
        })}
      </div>

      {/* Only while a filter is on, and worded as a filter result. "Showing 1 of 4" reads as
          pagination, as though three more prints were a click away, when it meant one print
          matched out of four. The way out of the filter belongs here too, next to the count that
          tells you that you are in one. */}
      {active !== ALL && (
        <p className="mt-10 text-center text-sm text-muted-foreground">
          {shown.length === 1 ? "1 print" : `${shown.length} prints`} in {active}.{" "}
          <button
            type="button"
            onClick={() => setActive(ALL)}
            className="font-semibold text-sage-500 underline underline-offset-2 hover:text-sage-400"
          >
            Show all {prints.length}
          </button>
        </p>
      )}
    </div>
  );
}
