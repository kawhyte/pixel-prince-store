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
    // Since the ladder was trimmed to five (2026-09-17) there is no exception: 20x30 was the only
    // size Fourthwall's framed template did not carry, and dropping it was half the reason it went.
    // If a size without a framed price ever returns, this fails and the sentence needs the caveat back.
    expect(unframedOnly.map((s) => s.id)).toEqual([]);
    expect(a).not.toMatch(/except/i);
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
    expect(SHOP_SIZE_LADDER).toHaveLength(5);
    expect(SIZE_RANGE_SENTENCE).toBe("Five sizes, from 8×10 to 24×36");
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

describe("the damage claim says what the clock runs from", () => {
  it("counts from delivery everywhere it is quoted", async () => {
    const { SHOP_SHIPPING_FAQ } = await import("@/config/shop-copy");
    const { shopPrintSchema } = await import("@/lib/product-schema");
    const damage = SHOP_SHIPPING_FAQ.find((f) => /damaged/i.test(f.q))!;
    // "within 30 days" alone is ambiguous: with a 5 to 11 business day window, delivery and order
    // date are a fortnight apart, and the gap only ever comes up during an argument.
    expect(damage.a).toMatch(/\d+ days of delivery/);

    const art = { _id: "a", id: "x", title: "X", artist: "A", description: "d", previewImage: "p", listing: "shop", kind: "single", offers: [], tags: [] };
    const policy = (shopPrintSchema(art as never).offers as Record<string, Record<string, unknown>> | undefined)?.hasMerchantReturnPolicy;
    if (policy) expect(String(policy.description)).toMatch(/\d+ days of delivery/);
  });

  it("keeps the window at what Fourthwall actually honours", async () => {
    const { DAMAGE_CLAIM_DAYS } = await import("@/config/support");
    // Fourthwall's own claim window is 30 days from delivery and the production partner funds the
    // replacement. Promising longer would mean funding it ourselves.
    expect(DAMAGE_CLAIM_DAYS).toBeLessThanOrEqual(30);
  });
});

describe("the size guide does not claim a count of its own", () => {
  it("builds its alt text from the ladder", async () => {
    const { SIZE_GUIDE_IMAGE } = await import("@/config/shop-copy");
    const { SIZE_RANGE_SENTENCE, SHOP_SIZE_LADDER } = await import("@/config/commerce");
    // It read "seven print sizes" while the ladder held eight, and nothing caught it.
    expect(SIZE_GUIDE_IMAGE.alt).toContain(SIZE_RANGE_SENTENCE.slice(1));
    expect(SIZE_GUIDE_IMAGE.alt).not.toMatch(/\bseven\b/i);
    expect(SHOP_SIZE_LADDER.length).toBeGreaterThan(0);
  });

  it("every size the shop sells has guide text and both prices", async () => {
    const { SHOP_SIZE_LADDER, TARGET_PRICES } = await import("@/config/commerce");
    const { SHOP_SIZE_GUIDE } = await import("@/config/shop-copy");
    for (const s of SHOP_SIZE_LADDER) {
      expect(SHOP_SIZE_GUIDE[s.id], `${s.id} has no guide text`).toBeTruthy();
      expect(TARGET_PRICES.unframed[s.id], `${s.id} has no unframed price`).toBeGreaterThan(0);
      expect(TARGET_PRICES.framed[s.id], `${s.id} has no framed price`).toBeGreaterThan(0);
    }
  });
})
