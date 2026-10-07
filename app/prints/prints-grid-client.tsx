"use client";

import { Suspense, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import type { FreeArt } from "@/sanity/lib/client";
import { cardCommerce } from "@/lib/commerce";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import { clsx as cn } from "clsx";
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
const SETS = "Sets";

/**
 * Category chips + card grid for /prints (PLAN-43). Filters the already-fetched list, no refetch.
 * The URL (?category= / ?kind=set) is the only filter state, so nav links, chips, Back and shared
 * links all agree. The server renders the full grid (the Suspense fallback) for crawlers.
 */
export default function PrintsGridClient(props: PrintsGridClientProps) {
  return (
    <Suspense fallback={<PrintsGrid {...props} active={ALL} />}>
      <FilteredPrintsGrid {...props} />
    </Suspense>
  );
}

function FilteredPrintsGrid(props: PrintsGridClientProps) {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const active = params.get("kind") === "set" ? SETS : (params.get("category") ?? ALL);
  const setActive = (c: string) => {
    const next = c === ALL ? "" : c === SETS ? "?kind=set" : `?category=${encodeURIComponent(c)}`;
    router.replace(`${pathname}${next}`, { scroll: false });
  };
  return <PrintsGrid {...props} active={active} onPick={setActive} />;
}

function PrintsGrid({
  prints,
  newIds,
  active: requested,
  onPick,
}: PrintsGridClientProps & { active: string; onPick?: (c: string) => void }) {
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
  const active = categories.includes(requested) ? requested : ALL;
  const setActive = (c: string) => onPick?.(c);
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
