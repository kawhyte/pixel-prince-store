import { describe, it, expect } from "vitest";

import { TARGET_PRICES } from "@/config/commerce";
import { draftDescription } from "@/lib/listing-copy";
import { auditPrint, comparePrices, isUntouchedCopy, type FwSnapshot, type StudioSnapshot } from "@/lib/shop-doctor";

const priced = (over: Record<string, number | null> = {}) =>
  new Map<string, number | null>(Object.entries({ ...TARGET_PRICES.unframed, ...over } as Record<string, number | null>));

function fw(over: Partial<FwSnapshot> = {}): FwSnapshot {
  return { id: "p1", name: "Sweden Map", version: null, finish: "unframed", access: "PUBLIC", prices: priced(), ...over };
}

function studio(over: Partial<StudioSnapshot> = {}): StudioSnapshot {
  return {
    id: "fw-p1",
    isDraft: false,
    title: "Sweden Map",
    description: "A map of Sweden, written by a human.",
    longDescription: "Longer copy, also written by a human.",
    category: "Maps",
    tags: ["map"],
    hasPreviewImage: true,
    roomPhotos: 2,
    offers: [{ version: null, finish: "unframed", hasMockup: true, hasArt: true, providerProductId: "p1" }],
    ...over,
  };
}

describe("comparePrices", () => {
  it("names the rows that disagree and leaves the rest alone", () => {
    const { wrong } = comparePrices("unframed", priced({ "8x10": 2500, "24x36": 4500 }));
    expect(wrong.map((r) => [r.sizeId, r.now, r.target])).toEqual([["8x10", 2500, 2399]]);
    expect(comparePrices("unframed", priced()).wrong).toEqual([]);
  });

  it("reports a ladder size the product does not sell, and ignores a size the ladder omits", () => {
    const missing = priced();
    missing.delete("24x36");
    missing.set("30x40", 9900); // sold by Fourthwall, not on our ladder
    const { wrong, unchecked } = comparePrices("unframed", missing);
    expect(wrong).toEqual([{ sizeId: "24x36", now: null, target: 4500 }]);
    expect(unchecked).toEqual(["30x40"]);
  });

  it("returns rows in ladder order, not the order Fourthwall gave them", () => {
    const shuffled = new Map<string, number | null>([["24x36", 1], ["8x10", 1], ["16x20", 1]]);
    const rows = comparePrices("unframed", shuffled).rows;
    // Sizes the product does not sell are rows too, and sort into their ladder position, so
    // compare only the three that were given.
    expect(rows.filter((r) => r.now !== null).map((r) => r.sizeId)).toEqual(["8x10", "16x20", "24x36"]);
    expect(rows.map((r) => r.sizeId)).toEqual(["8x10", "11x14", "12x16", "12x18", "16x20", "18x24", "20x30", "24x36"]);
  });
});

describe("isUntouchedCopy", () => {
  it("spots copy that is still the generated line", () => {
    const input = { title: "Sweden Map", category: "Maps", versions: ["Earth"], finishes: ["unframed"] };
    expect(isUntouchedCopy(draftDescription(input), "description", input)).toBe(true);
    expect(isUntouchedCopy(`  ${draftDescription(input)}  `, "description", input)).toBe(true);
    expect(isUntouchedCopy("Something Kenny actually wrote.", "description", input)).toBe(false);
    expect(isUntouchedCopy(undefined, "description", input)).toBe(false);
  });
});

describe("auditPrint", () => {
  const blockers = (r: { findings: { severity: string; message: string }[] }) =>
    r.findings.filter((f) => f.severity === "blocker").map((f) => f.message);

  it("passes a finished print", () => {
    const r = auditPrint("Sweden Map", [fw()], studio());
    expect(r.ready).toBe(true);
    expect(r.findings).toEqual([]);
  });

  it("blocks on nothing in Fourthwall and does not then complain about Studio", () => {
    const r = auditPrint("Sweden Map", [], null);
    expect(r.ready).toBe(false);
    expect(r.findings).toHaveLength(1);
    expect(r.findings[0].message).toMatch(/no products in Fourthwall/);
  });

  it("blocks a print that sells framed only, because its cheapest price is the framed one", () => {
    const framed = fw({ name: "Sweden Map | Framed", finish: "framed", version: "Earth", prices: new Map(Object.entries(TARGET_PRICES.framed as Record<string, number>)) });
    expect(blockers(auditPrint("Sweden Map", [framed], studio()))).toContain(
      "Earth sells framed only, so its cheapest price is the framed one"
    );
  });

  it("blocks a partly published listing, because the page then offers less than you think", () => {
    const r = auditPrint("Sweden Map", [fw(), fw({ id: "p2", name: "Sweden Map | Framed", finish: "framed", access: "HIDDEN", prices: new Map(Object.entries(TARGET_PRICES.framed as Record<string, number>)) })], studio());
    expect(blockers(r)).toContain("1 of 2 products are public, so the site sees a partial listing");
  });

  it("ignores archived products entirely", () => {
    const r = auditPrint("Sweden Map", [fw(), fw({ id: "old", access: "ARCHIVED", prices: priced({ "8x10": 1 }) })], studio());
    expect(r.ready).toBe(true);
  });

  it("blocks a draft, a missing category and an offer with nothing to show", () => {
    const r = auditPrint("Sweden Map", [fw()], studio({
      isDraft: true,
      category: undefined,
      hasPreviewImage: false,
      offers: [{ version: null, finish: "unframed", hasMockup: false, hasArt: false, providerProductId: "p1" }],
    }));
    const msgs = blockers(r);
    expect(msgs).toContain("still a draft in Studio");
    expect(msgs).toContain("no category, so it is missing from every collection page");
    expect(msgs).toContain("no card image");
    expect(msgs.some((m) => /nothing to show/.test(m))).toBe(true);
    expect(r.ready).toBe(false);
  });

  it("does not call an unframed offer broken for having no mockup", () => {
    // This is the normal shape: the poster shows the flat artwork, and offerImage falls back to
    // it. Treating a missing mockup as "no photo" flagged every print in the shop.
    const r = auditPrint("Sweden Map", [fw()], studio({
      offers: [{ version: null, finish: "unframed", hasMockup: false, hasArt: true, providerProductId: "p1" }],
    }));
    expect(r.ready).toBe(true);
    expect(r.findings).toEqual([]);
  });

  it("mentions, without blocking, a poster falling back to a mockup of itself", () => {
    const r = auditPrint("Sweden Map", [fw()], studio({
      offers: [{ version: null, finish: "unframed", hasMockup: true, hasArt: false, providerProductId: "p1" }],
    }));
    expect(r.ready).toBe(true);
    expect(r.findings.map((f) => f.message)).toContain("1 unframed offer showing a mockup rather than the artwork");
  });

  it("notices a public product that never reached Studio", () => {
    const r = auditPrint("Sweden Map", [fw(), fw({ id: "p2", name: "Sweden Map | Framed", finish: "framed", prices: new Map(Object.entries(TARGET_PRICES.framed as Record<string, number>)) })], studio());
    expect(blockers(r)).toContain("Sweden Map | Framed: public in Fourthwall but not an offer in Studio");
  });

  it("keeps an empty gallery a warning, because emptying it is a decision", () => {
    const r = auditPrint("Sweden Map", [fw()], studio({ roomPhotos: 0 }));
    expect(r.ready).toBe(true);
    expect(r.findings).toEqual([{ severity: "warning", message: "no room photos", fix: "npm run shop:photo -- --room" }]);
  });

  it("warns about generated copy and a missing default version without blocking", () => {
    const input = { title: "Sweden Map", category: "Maps", versions: ["Earth", "Bright"], finishes: ["unframed"] };
    const two = [fw({ version: "Earth" }), fw({ id: "p2", version: "Bright" })];
    const r = auditPrint("Sweden Map", two, studio({
      description: draftDescription(input),
      defaultVersion: undefined,
      offers: [
        { version: "Earth", finish: "unframed", hasMockup: true, hasArt: true, providerProductId: "p1" },
        { version: "Bright", finish: "unframed", hasMockup: true, hasArt: true, providerProductId: "p2" },
      ],
    }));
    expect(r.ready).toBe(true);
    const warnings = r.findings.map((f) => f.message);
    expect(warnings).toContain("description is still the generated one");
    expect(warnings.some((m) => /2 versions and no default/.test(m))).toBe(true);
  });

  it("puts blockers before warnings", () => {
    const r = auditPrint("Sweden Map", [fw()], studio({ isDraft: true, roomPhotos: 0, tags: [] }));
    const severities = r.findings.map((f) => f.severity);
    expect(severities.indexOf("blocker")).toBeLessThan(severities.indexOf("warning"));
  });
});

describe("auditPrint for a set", () => {
  const setSnap = (over: Partial<import("@/lib/shop-doctor").SetSnapshot> = {}) => ({
    listed: 2,
    sellable: 2,
    broken: [] as string[],
    finishes: ["unframed", "framed"],
    sizesByFinish: { unframed: 8, framed: 7 },
    ...over,
  });

  it("passes a healthy set without ever asking it for a Fourthwall product", () => {
    // A set has none. Every price, publish and mockup check would be a blocker it cannot clear.
    const r = auditPrint("Retro Gaming Set", [], studio({ title: "Retro Gaming Set" }), setSnap());
    expect(r.ready).toBe(true);
    expect(r.findings).toEqual([]);
    expect(r.priceRowsWrong).toBe(0);
  });

  it("blocks when a member is gone, and names it", () => {
    // Unpublishing a print is one click, and the effect lands on a page nobody was looking at.
    const r = auditPrint("Retro Gaming Set", [], studio(), setSnap({ sellable: 1, broken: ["Retro Consoles"] }));
    expect(r.ready).toBe(false);
    expect(r.findings[0].message).toContain("Retro Consoles");
  });

  it("warns, without blocking, when a set of three loses one", () => {
    const r = auditPrint("Trio", [], studio(), setSnap({ listed: 3, sellable: 2, broken: ["Third Print"] }));
    expect(r.ready).toBe(true);
    expect(r.findings.map((f) => f.message).join(" ")).toContain("Third Print");
  });

  it("blocks a set whose prints share no finish or no size", () => {
    const noFinish = auditPrint("X", [], studio(), setSnap({ finishes: [], sizesByFinish: {} }));
    expect(noFinish.ready).toBe(false);
    expect(noFinish.findings[0].message).toMatch(/share no finish/);

    const noSize = auditPrint("X", [], studio(), setSnap({ finishes: ["framed"], sizesByFinish: { framed: 0 } }));
    expect(noSize.ready).toBe(false);
    expect(noSize.findings.some((f) => /share no size/.test(f.message))).toBe(true);
  });

  it("insists on a card image, because a set has no artwork to fall back on", () => {
    const r = auditPrint("X", [], studio({ hasPreviewImage: false }), setSnap());
    expect(r.ready).toBe(false);
    expect(r.findings.some((f) => /no card image/.test(f.message))).toBe(true);
  });
});
