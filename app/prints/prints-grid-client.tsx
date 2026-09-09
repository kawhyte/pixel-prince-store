"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

import type { FreeArt } from "@/sanity/lib/client";
import { cardCommerce, isNewPrint } from "@/lib/commerce";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import { cn } from "@/lib/utils";

interface PrintsGridClientProps {
  prints: FreeArt[];
}

const ALL = "All prints";
const subscribeNoop = () => () => {};
const SETS = "Sets";

/** Category chips + card grid for /prints (PLAN-43). Filters the already-fetched list, no refetch. */
export default function PrintsGridClient({ prints }: PrintsGridClientProps) {
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

      <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 lg:gap-10 xl:grid-cols-4">
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
              badge={isNewPrint(art.createdAt) ? "New" : undefined}
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            />
          );
        })}
      </div>

      <p className="mt-10 text-center text-sm text-muted-foreground">
        Showing {shown.length} of {prints.length}
      </p>
    </div>
  );
}
