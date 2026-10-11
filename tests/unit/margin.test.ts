import { describe, it, expect } from "vitest";

import { costsByFinish, pickMarginCents } from "@/lib/margin";

const variant = (size: string, cost: number, color?: string) => ({
  id: `${size}-${color ?? "x"}`,
  name: size,
  attributes: { size: { name: size }, ...(color ? { color: { name: color } } : {}) },
  unitCost: { value: cost },
});

describe("costsByFinish", () => {
  it("reads printer cost per size per finish, Black frame first", () => {
    const costs = costsByFinish([
      { name: "Sweden Map", variants: [variant("8″×10″", 8.5), variant("18″×24″", 14)] },
      { name: "Sweden Map | Framed", variants: [variant("18″×24″", 60, "White"), variant("18″×24″", 55, "Black")] },
    ]);
    expect(costs.unframed?.get("8x10")).toBe(850);
    expect(costs.unframed?.get("18x24")).toBe(1400);
    expect(costs.framed?.get("18x24")).toBe(5500);
  });
});

describe("pickMarginCents", () => {
  const costs = new Map([["8x10", 850], ["16x20", 1200], ["18x24", 1400], ["24x36", 2000]]);

  it("makes a single-size product exactly right", () => {
    // unframed 24x36 target is $45.00
    expect(pickMarginCents("unframed", ["24x36"], costs)).toEqual({ marginCents: 2500, exactSize: "24x36" });
  });

  it("prefers the Popular size when the product sells it", () => {
    // unframed 18x24 target is $37.00
    expect(pickMarginCents("unframed", ["8x10", "18x24", "24x36"], costs)).toEqual({ marginCents: 2300, exactSize: "18x24" });
  });

  it("otherwise the largest size", () => {
    // unframed 16x20 target is $34.00
    expect(pickMarginCents("unframed", ["8x10", "16x20"], costs)).toEqual({ marginCents: 2200, exactSize: "16x20" });
  });

  it("gives up without a cost, so the caller keeps its default", () => {
    expect(pickMarginCents("unframed", ["11x14"], costs)).toBeNull();
    expect(pickMarginCents("framed", ["24x36"], undefined)).toBeNull();
  });
});
