import { describe, it, expect } from "vitest";

import {
  deriveRatio,
  isLandscape,
  meetsMasterResolution,
  MIN_MASTER_LONG_EDGE,
  MIN_MASTER_SHORT_EDGE,
  PRINT_SIZES,
} from "@/config/print-sizes";

describe("deriveRatio", () => {
  it("reads portrait and landscape masters, not portrait only", () => {
    expect(deriveRatio(2400, 3000)).toBe("4:5");
    expect(deriveRatio(4800, 6000)).toBe("4:5");
    // The three live landscape masters. These returned null, and the page then showed the
    // portrait ladder, telling a reader to buy a frame their print does not fit.
    expect(deriveRatio(3000, 2400)).toBe("5:4");
    expect(deriveRatio(6000, 4800)).toBe("5:4");
  });

  it("still refuses a crop we do not print", () => {
    expect(deriveRatio(3000, 3000)).toBeNull(); // square
    expect(deriveRatio(2000, 3000)).toBeNull(); // 2:3
    expect(deriveRatio(3000, 2000)).toBeNull();
    expect(deriveRatio(0, 3000)).toBeNull();
    expect(deriveRatio(-1, 3000)).toBeNull();
  });

  it("is symmetric: turning a master on its side turns the answer on its side", () => {
    for (const [w, h] of [[2400, 3000], [4800, 6000], [3040, 3800]]) {
      const portrait = deriveRatio(w, h);
      const landscape = deriveRatio(h, w);
      expect(portrait).toBe("4:5");
      expect(landscape).toBe("5:4");
      expect(isLandscape(landscape!)).toBe(true);
      expect(isLandscape(portrait!)).toBe(false);
    }
  });
});

describe("print size ladders", () => {
  it("gives landscape the same rungs, turned on their side", () => {
    expect(PRINT_SIZES["4:5"].map((s) => s.label)).toEqual(['4×5″', '8×10″', '16×20″']);
    expect(PRINT_SIZES["5:4"].map((s) => s.label)).toEqual(['5×4″', '10×8″', '20×16″']);
    expect(PRINT_SIZES["5:4"]).toHaveLength(PRINT_SIZES["4:5"].length);
    // Same frames either way up, so the guidance must match rung for rung.
    PRINT_SIZES["4:5"].forEach((p, i) => expect(PRINT_SIZES["5:4"][i].fits).toBe(p.fits));
  });
});

describe("master resolution", () => {
  it("measures the long edge, so a landscape master is judged the same as a portrait one", () => {
    expect(meetsMasterResolution(4800, 6000)).toBe(true);
    expect(meetsMasterResolution(6000, 4800)).toBe(true);
    // Every master in the library today, portrait and landscape alike.
    expect(meetsMasterResolution(2400, 3000)).toBe(false);
    expect(meetsMasterResolution(3000, 2400)).toBe(false);
    expect(MIN_MASTER_LONG_EDGE).toBe(6000);
    expect(MIN_MASTER_SHORT_EDGE).toBe(4800);
  });
});
