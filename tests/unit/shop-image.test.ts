import { describe, it, expect } from "vitest";
import {
  heroFrame,
  heroSourceNeeded,
  heroShortfall,
  HERO_MAX_WIDTH,
  HERO_MAX_HEIGHT,
  SHOP_IMAGE_WIDTH,
  SHOP_IMAGE_HEIGHT,
} from "@/config/shop-image";

const r = (w: number, h: number) => w / h;

describe("shop photo sizing", () => {
  it("gives a 4:3 mockup the full width, a 3:4 photo the full height, and never exceeds either cap", () => {
    const wide = heroFrame(r(3000, 2250));
    expect(Math.round(wide.width)).toBe(HERO_MAX_WIDTH);
    expect(Math.round(wide.height)).toBe(540);
    const f = heroFrame(r(1140, 1520));
    expect(Math.round(f.width)).toBe(570);
    expect(Math.round(f.height)).toBe(HERO_MAX_HEIGHT);
    for (const [w, h] of [[3000, 2250], [1140, 1520], [1024, 1536], [1280, 1586], [2000, 1000]]) {
      const frame = heroFrame(r(w, h));
      expect(frame.width).toBeLessThanOrEqual(HERO_MAX_WIDTH + 0.01);
      expect(frame.height).toBeLessThanOrEqual(HERO_MAX_HEIGHT + 0.01);
    }
  });

  it("shows a photo taller than 3:4 narrower rather than cropping it", () => {
    // 2:3 is taller, so height binds and the width gives way
    const f = heroFrame(r(1024, 1536));
    expect(Math.round(f.height)).toBe(HERO_MAX_HEIGHT);
    expect(Math.round(f.width)).toBe(507);
    // the frame keeps the photo's own shape, which is what stops bars and crops
    expect(f.width / f.height).toBeCloseTo(r(1024, 1536), 5);
  });

  it("asks for exactly the source a 2x screen needs", () => {
    expect(heroSourceNeeded(r(3000, 2250))).toEqual({ width: 1440, height: 1080 });
    expect(heroSourceNeeded(r(1140, 1520))).toEqual({ width: 1140, height: 1520 });
    expect(heroSourceNeeded(r(1024, 1536))).toEqual({ width: 1014, height: 1520 });
  });

  it("passes the Etsy export and a tall photo that is genuinely big enough", () => {
    expect(heroShortfall({ width: SHOP_IMAGE_WIDTH, height: SHOP_IMAGE_HEIGHT }).short).toBeNull();
    // the room photo a width-only rule wrongly flagged: 1024 wide is enough at 2:3
    expect(heroShortfall({ width: 1024, height: 1536 }).short).toBeNull();
    expect(heroShortfall({ width: 1280, height: 1586 }).short).toBeNull();
  });

  it("names the dimension holding the frame back, not just the one that missed", () => {
    // the requirement keeps the photo's shape, so a small photo is short on both by the same
    // proportion; what matters is which one caps the frame
    const tall = heroShortfall({ width: 800, height: 1200 }); // 2:3, height-capped
    expect(tall.short).toBe("height");
    expect(tall.needed).toEqual({ width: 1014, height: 1520 });
    const wide = heroShortfall({ width: 1200, height: 900 }); // 4:3, width-capped
    expect(wide.short).toBe("width");
    expect(wide.needed).toEqual({ width: 1440, height: 1080 });
    // proportionally short by the same amount either way
    expect(1200 / 1440).toBeCloseTo(900 / 1080, 6);
    // the Etsy-shrunk copy of a mockup is not enough; the original is
    expect(heroShortfall({ width: 1140, height: 855 }).short).toBe("width");
  });

  it("does not divide by zero on a missing or nonsense ratio", () => {
    expect(heroFrame(0)).toEqual({ width: HERO_MAX_WIDTH, height: HERO_MAX_HEIGHT });
    expect(heroFrame(Number.NaN)).toEqual({ width: HERO_MAX_WIDTH, height: HERO_MAX_HEIGHT });
  });
});
