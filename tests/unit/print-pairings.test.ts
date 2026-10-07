import { describe, it, expect } from "vitest";

import { pairsForPrint, relatedForPrint } from "@/lib/print-pairings";
import type { FreeArt, PrintOffer } from "@/sanity/lib/client";

const offer: PrintOffer = {
  provider: "fourthwall",
  finish: "unframed",
  sizes: [{ sizeId: "8x10", priceCents: 2300, providerVariantId: "v" }],
};

function art(id: string, category: string, extra: Partial<FreeArt> = {}): FreeArt {
  return {
    _id: id,
    id,
    createdAt: "2026-09-01",
    title: id,
    artist: "The Pixel Prince",
    description: "",
    previewImage: `https://cdn.sanity.io/${id}.png`,
    listing: "shop",
    kind: "single",
    offers: [offer],
    tags: [],
    category,
    ...extra,
  };
}

const member = (id: string) => ({ print: { _id: id, title: id, slug: { current: id }, offers: [offer] } });

const brooklyn = art("brooklyn", "Maps");
const queens = art("queens", "Maps");
const bronx = art("bronx", "Maps");
const mario = art("mario", "Video Games");
const noPrice = art("no-price", "Maps", { offers: [] });
const pair = art("brooklyn-queens", "Maps", { kind: "set", offers: [], members: [member("brooklyn"), member("queens")] });
const otherPair = art("bronx-queens", "Maps", { kind: "set", offers: [], members: [member("bronx"), member("queens")] });
const all = [noPrice, otherPair, pair, queens, mario, bronx, brooklyn];

describe("pairsForPrint", () => {
  it("leads with a set that holds this print, then its category", () => {
    expect(pairsForPrint(brooklyn, all).map((p) => p.id)).toEqual(["brooklyn-queens", "queens"]);
  });

  it("skips prints with no price and sets without this print", () => {
    expect(pairsForPrint(brooklyn, all, 5).map((p) => p.id)).toEqual(["brooklyn-queens", "queens", "bronx", "mario"]);
  });

  it("falls back to other categories", () => {
    expect(pairsForPrint(mario, all).map((p) => p.id)).toEqual(["queens", "bronx"]);
  });

  it("shows nothing on a set's own page", () => {
    expect(pairsForPrint(pair, all)).toEqual([]);
  });
});

describe("relatedForPrint", () => {
  it("lists the category without what the buy column shows", () => {
    const shown = pairsForPrint(brooklyn, all);
    expect(relatedForPrint(brooklyn, all, shown).map((p) => p.id)).toEqual(["no-price", "bronx-queens", "bronx"]);
  });
});
