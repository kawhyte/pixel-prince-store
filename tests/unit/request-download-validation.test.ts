import { describe, it, expect, vi } from "vitest";

// The store only needs Sanity at call time; keep these pure tests free of env vars.
vi.mock("@/sanity/lib/write-client", () => ({ writeClient: null }));

import {
  normalizeEmail,
  canonicalEmail,
  weeklyDownloadCount,
  isOverWeeklyLimit,
  type SubscriberDoc,
} from "@/lib/subscriber-store";

describe("normalizeEmail", () => {
  it("lowercases and trims", () => {
    expect(normalizeEmail("  Kenny@Example.com  ")).toBe("kenny@example.com");
  });
});

describe("canonicalEmail", () => {
  it("drops a +tag so one inbox gets one weekly limit", () => {
    expect(canonicalEmail("Me+one@Example.com")).toBe("me@example.com");
  });

  it("drops Gmail dots and folds googlemail.com", () => {
    expect(canonicalEmail("m.e+x@gmail.com")).toBe("me@gmail.com");
    expect(canonicalEmail("m.e@googlemail.com")).toBe("me@gmail.com");
  });

  it("keeps dots for other providers", () => {
    expect(canonicalEmail("first.last@example.com")).toBe("first.last@example.com");
  });
});

describe("weeklyDownloadCount / isOverWeeklyLimit", () => {
  it("counts downloads inside the 7-day window as over limit at 3", () => {
    const now = Date.now();
    const sub: SubscriberDoc = {
      _id: "subscriber-x",
      email: "a@b.com",
      downloads: [
        { artId: "a", sizeId: "8x10", requestedAt: new Date(now - 1000).toISOString() },
        { artId: "b", sizeId: "8x10", requestedAt: new Date(now - 2000).toISOString() },
        { artId: "c", sizeId: "8x10", requestedAt: new Date(now - 3000).toISOString() },
      ],
    };
    expect(weeklyDownloadCount(sub)).toBe(3);
    expect(isOverWeeklyLimit(sub)).toBe(true);
  });

  it("ignores downloads older than 7 days", () => {
    const now = Date.now();
    const eightDaysAgo = now - 8 * 24 * 60 * 60 * 1000;
    const sub: SubscriberDoc = {
      _id: "subscriber-x",
      email: "a@b.com",
      downloads: [
        { artId: "a", sizeId: "8x10", requestedAt: new Date(eightDaysAgo).toISOString() },
        { artId: "b", sizeId: "8x10", requestedAt: new Date(eightDaysAgo).toISOString() },
        { artId: "c", sizeId: "8x10", requestedAt: new Date(eightDaysAgo).toISOString() },
      ],
    };
    expect(weeklyDownloadCount(sub)).toBe(0);
    expect(isOverWeeklyLimit(sub)).toBe(false);
  });

  it("treats null subscriber as zero downloads", () => {
    expect(weeklyDownloadCount(null)).toBe(0);
    expect(isOverWeeklyLimit(null)).toBe(false);
  });
});
