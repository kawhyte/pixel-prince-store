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
    expect(answer(/how long does delivery take/i)).toMatch(/\d+ to \d+ days/);
  });
});
