import { describe, it, expect } from "vitest";
import { SHOP_SHIPPING_FAQ } from "@/config/shop-copy";
import { TARGET_PRICES, SHOP_SIZE_LADDER } from "@/config/commerce";

const answer = (match: RegExp) => SHOP_SHIPPING_FAQ.find((f) => match.test(f.q))?.a ?? "";

describe("shop FAQ claims match the price list", () => {
  it("does not tell a buyer every print ships unframed, because framed is sold too", () => {
    const framedSizes = Object.keys(TARGET_PRICES.framed);
    expect(framedSizes.length).toBeGreaterThan(0);
    for (const f of SHOP_SHIPPING_FAQ) {
      expect(f.a).not.toMatch(/every print ships unframed/i);
    }
  });

  it("names exactly the sizes that cannot be framed", () => {
    const a = answer(/frame included/i);
    const unframedOnly = SHOP_SIZE_LADDER.filter(
      (s) => TARGET_PRICES.unframed[s.id] !== undefined && TARGET_PRICES.framed[s.id] === undefined,
    );
    // today that is 20x30 alone; if the ladder changes, this fails and the sentence needs rewriting
    expect(unframedOnly.map((s) => s.id)).toEqual(["20x30"]);
    expect(a).toMatch(/20 by 30/);
  });

  it("describes both finishes wherever it describes packaging or framing", () => {
    for (const match of [/frame included/i, /how is it packaged/i]) {
      const a = answer(match);
      expect(a).toMatch(/unframed/i);
      expect(a).toMatch(/framed/i);
    }
  });

  it("still answers the two questions the buy stack pulls up front", () => {
    expect(answer(/how much is shipping/i)).toMatch(/free/i);
    // "business days" specifically: nothing ships at a weekend, and the promise says so.
    expect(answer(/how long does delivery take/i)).toMatch(/\d+ to \d+ business days/);
  });
});

describe("the size-count sentence tracks the ladder", () => {
  it("counts what is actually sold, in words", async () => {
    const { SIZE_RANGE_SENTENCE, SHOP_SIZE_LADDER } = await import("@/config/commerce");
    expect(SHOP_SIZE_LADDER).toHaveLength(8);
    expect(SIZE_RANGE_SENTENCE).toBe("Eight sizes, from 8×10 to 24×36");
    // the endpoints come from the ladder, not from the sentence
    expect(SIZE_RANGE_SENTENCE).toContain(SHOP_SIZE_LADDER[0].label.replace("″", ""));
    expect(SIZE_RANGE_SENTENCE).toContain(SHOP_SIZE_LADDER[SHOP_SIZE_LADDER.length - 1].label.replace("″", ""));
  });

  it("no page hard-codes a size count any more", async () => {
    const { readFileSync } = await import("fs");
    for (const f of ["app/prints/page.tsx", "config/home-copy.ts", "app/shipping-returns/page.tsx"]) {
      const src = readFileSync(f, "utf8");
      expect(src).not.toMatch(/\b(three|four|five|six|seven|eight|nine|ten)\s+sizes\b/i);
    }
  });
});
