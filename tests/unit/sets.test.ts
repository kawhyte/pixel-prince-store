import { describe, it, expect } from "vitest";

import {
  isSet,
  sellableSet,
  setFinishes,
  setFromPriceCents,
  setMembers,
  setNoun,
  setPriceCents,
  setSizes,
  setVariantIds,
  type WithMembers,
} from "@/lib/sets";
import type { PrintOffer, SetMember } from "@/sanity/lib/client";

const size = (sizeId: string, priceCents: number, variant = `v-${sizeId}`) => ({
  sizeId,
  priceCents,
  providerVariantId: variant,
});

function offer(over: Partial<PrintOffer> = {}): PrintOffer {
  return {
    provider: "fourthwall",
    finish: "unframed",
    active: true,
    sizes: [size("8x10", 2399), size("16x20", 3400), size("24x36", 4500)],
    ...over,
  };
}

function member(title: string, offers: PrintOffer[], version?: string): SetMember {
  return {
    ...(version ? { version } : {}),
    print: { _id: `id-${title}`, title, slug: { current: title.toLowerCase().replace(/\s+/g, "-") }, offers },
  };
}

const set = (members: SetMember[]): WithMembers => ({ kind: "set", members });

const framed = (over: Partial<PrintOffer> = {}) =>
  offer({ finish: "framed", sizes: [size("8x10", 5800), size("16x20", 9500)], ...over });

describe("what counts as a set", () => {
  it("needs kind set and members", () => {
    expect(isSet(set([member("A", [offer()]), member("B", [offer()])]))).toBe(true);
    expect(isSet({ kind: "set", members: [] })).toBe(false);
    expect(isSet({ kind: "single", members: [member("A", [offer()])] })).toBe(false);
  });

  it("drops a member that cannot be sold, and stops being a set below two", () => {
    // Unpublishing a print is one click and the effect lands here, two pages away.
    const gone: SetMember = { print: undefined };
    const noOffers = member("B", []);
    const inactive = member("C", [offer({ active: false })]);
    const good = member("A", [offer()]);

    expect(setMembers(set([good, gone])).map((m) => m.title)).toEqual(["A"]);
    expect(setMembers(set([good, noOffers])).map((m) => m.title)).toEqual(["A"]);
    expect(setMembers(set([good, inactive])).map((m) => m.title)).toEqual(["A"]);
    expect(sellableSet(set([good, gone]))).toBe(false);
    expect(sellableSet(set([good, member("B", [offer()])]))).toBe(true);
  });

  it("keeps Studio's order, because the page and the cart drawer both read it", () => {
    const s = set([member("Consoles", [offer()]), member("Controllers", [offer()])]);
    expect(setMembers(s).map((m) => m.title)).toEqual(["Consoles", "Controllers"]);
  });

  it("counts what is sellable, not what the title claims", () => {
    expect(setNoun(set([member("A", [offer()]), member("B", [offer()])]))).toBe("Set of 2");
    expect(setNoun(set([member("A", [offer()]), member("B", [offer()]), member("C", [offer()])]))).toBe("Set of 3");
  });
});

describe("finishes are an intersection", () => {
  it("offers a finish only when every member sells it", () => {
    const both = member("A", [offer(), framed()]);
    const posterOnly = member("B", [offer()]);
    expect(setFinishes(set([both, member("C", [offer(), framed()])]))).toEqual(["unframed", "framed"]);
    // B has no framed product, so a framed set could not be made at all.
    expect(setFinishes(set([both, posterOnly]))).toEqual(["unframed"]);
  });

  it("offers nothing when the members share no finish", () => {
    const framedOnly = member("A", [framed()]);
    const posterOnly = member("B", [offer()]);
    expect(setFinishes(set([framedOnly, posterOnly]))).toEqual([]);
  });
});

describe("sizes are an intersection, in ladder order", () => {
  it("keeps only the sizes every member sells", () => {
    const wide = member("A", [offer({ sizes: [size("8x10", 2399), size("16x20", 3400), size("24x36", 4500)] })]);
    const narrow = member("B", [offer({ sizes: [size("16x20", 3400), size("24x36", 4500)] })]);
    expect(setSizes(set([wide, narrow]), "unframed")).toEqual(["16x20", "24x36"]);
  });

  it("returns nothing when the overlap is empty, so the finish can be hidden", () => {
    const a = member("A", [offer({ sizes: [size("8x10", 2399)] })]);
    const b = member("B", [offer({ sizes: [size("24x36", 4500)] })]);
    expect(setSizes(set([a, b]), "unframed")).toEqual([]);
  });

  it("sorts by the ladder rather than by whatever order Fourthwall gave", () => {
    const shuffled = offer({ sizes: [size("24x36", 4500), size("8x10", 2399), size("16x20", 3400)] });
    expect(setSizes(set([member("A", [shuffled]), member("B", [shuffled])]), "unframed")).toEqual([
      "8x10",
      "16x20",
      "24x36",
    ]);
  });
});

describe("price is the members added up", () => {
  const a = member("A", [offer(), framed()]);
  const b = member("B", [offer(), framed()]);

  it("adds the members at that size and finish", () => {
    expect(setPriceCents(set([a, b]), "unframed", "8x10")).toBe(2399 * 2);
    expect(setPriceCents(set([a, b]), "framed", "16x20")).toBe(9500 * 2);
  });

  it("refuses a size a member does not sell, rather than quoting a partial total", () => {
    const short = member("B", [offer({ sizes: [size("8x10", 2399)] })]);
    expect(setPriceCents(set([a, short]), "unframed", "24x36")).toBeNull();
  });

  it("takes the cheapest buyable combination for the card", () => {
    expect(setFromPriceCents(set([a, b]))).toBe(2399 * 2);
    expect(setFromPriceCents(set([a, member("B", [framed()])]))).toBe(5800 * 2);
  });

  it("has no price at all when there is nothing to sell", () => {
    expect(setFromPriceCents(set([member("A", [offer()])]))).toBeNull();
  });
});

describe("cart variants", () => {
  it("returns one variant per member, in order", () => {
    const a = member("A", [offer({ sizes: [size("8x10", 2399, "va")] })]);
    const b = member("B", [offer({ sizes: [size("8x10", 2399, "vb")] })]);
    expect(setVariantIds(set([a, b]), "unframed", "8x10")).toEqual(["va", "vb"]);
  });

  it("is all or nothing, because half a set in the bag is worse than no button", () => {
    const a = member("A", [offer({ sizes: [size("8x10", 2399, "va")] })]);
    const noVariant = member("B", [offer({ sizes: [{ sizeId: "8x10", priceCents: 2399 }] })]);
    expect(setVariantIds(set([a, noVariant]), "unframed", "8x10")).toBeNull();
    expect(setVariantIds(set([a]), "unframed", "8x10")).toBeNull();
  });
});

describe("versions", () => {
  it("uses the version pinned on the member", () => {
    const earth = offer({ version: "Earth", sizes: [size("8x10", 2399, "earth")] });
    const bright = offer({ version: "Bright", sizes: [size("8x10", 2599, "bright")] });
    const pinned = member("Brooklyn", [earth, bright], "Bright");
    const plain = member("Other", [offer({ sizes: [size("8x10", 1000, "o")] })]);
    expect(setVariantIds(set([pinned, plain]), "unframed", "8x10")).toEqual(["bright", "o"]);
    expect(setPriceCents(set([pinned, plain]), "unframed", "8x10")).toBe(2599 + 1000);
  });

  it("falls back to the version the print itself opens on", () => {
    const earth = offer({ version: "Earth", sizes: [size("8x10", 2399, "earth")] });
    const bright = offer({ version: "Bright", sizes: [size("8x10", 2599, "bright")] });
    const unpinned = member("Brooklyn", [earth, bright]);
    const plain = member("Other", [offer({ sizes: [size("8x10", 1000, "o")] })]);
    expect(setVariantIds(set([unpinned, plain]), "unframed", "8x10")).toEqual(["earth", "o"]);
  });
});
