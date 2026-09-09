import { describe, it, expect } from "vitest";
import { REVIEWS, REVIEW_SUMMARY } from "@/config/reviews";

describe("config/reviews", () => {
  it("has enough reviews to fill the homepage and shop pages", () => {
    expect(REVIEWS.length).toBeGreaterThanOrEqual(9);
  });
  it("keeps quotes short, dash-free, and names anonymised", () => {
    for (const r of REVIEWS) {
      expect(r.quote.length, r.quote).toBeLessThanOrEqual(220);
      expect(r.quote, r.quote).not.toContain("—");
      expect(r.name, r.name).toMatch(/^[A-Z][\w'-]+( [A-Z]\.)?$/);
    }
  });
  it("has a summary line", () => {
    expect(REVIEW_SUMMARY.rating).toMatch(/^\d\.\d$/);
    expect(REVIEW_SUMMARY.count.length).toBeGreaterThan(0);
  });
});
