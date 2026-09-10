import { describe, it, expect } from "vitest";
import { deliveryWindow } from "@/lib/delivery";
import { DELIVERY_DAYS_MIN, DELIVERY_DAYS_MAX, DELIVERY_WINDOW } from "@/config/support";

describe("delivery window", () => {
  it("reads as one month when both ends fall in it", () => {
    // 5 and 11 days after 10 Sep 2026 is 15 and 21 Sep
    expect(deliveryWindow(new Date("2026-09-10T12:00:00Z")).label).toBe("Sep 15 to 21");
  });

  it("names the second month when the window crosses one", () => {
    // 5 and 11 days after 26 Sep is 1 and 7 Oct
    expect(deliveryWindow(new Date("2026-09-26T12:00:00Z")).label).toBe("Oct 1 to 7");
    // 5 and 11 days after 24 Sep is 29 Sep and 5 Oct
    expect(deliveryWindow(new Date("2026-09-24T12:00:00Z")).label).toBe("Sep 29 to Oct 5");
    // and across a year end
    expect(deliveryWindow(new Date("2026-12-28T12:00:00Z")).label).toBe("Jan 2 to 8");
  });

  it("counts from the promise in config/support, not from numbers typed here", () => {
    const from = new Date("2026-03-01T00:00:00Z");
    const w = deliveryWindow(from);
    const days = (d: Date) => Math.round((d.getTime() - from.getTime()) / 86_400_000);
    expect(days(w.start)).toBe(DELIVERY_DAYS_MIN);
    expect(days(w.end)).toBe(DELIVERY_DAYS_MAX);
    expect(DELIVERY_WINDOW).toBe(`${DELIVERY_DAYS_MIN} to ${DELIVERY_DAYS_MAX} days`);
  });

  it("is stable whatever the renderer's clock zone, because it works in UTC", () => {
    // the same instant, written two ways; the label must not move
    const a = deliveryWindow(new Date("2026-09-10T23:30:00Z")).label;
    const b = deliveryWindow(new Date("2026-09-10T23:30:00.000Z")).label;
    expect(a).toBe(b);
    // an instant late in the UTC day still lands on the UTC date, not the local one
    expect(deliveryWindow(new Date("2026-09-10T23:59:59Z")).label).toBe("Sep 15 to 21");
  });

  it("takes an override, so a different promise does not need a code change here", () => {
    expect(deliveryWindow(new Date("2026-09-10T12:00:00Z"), 1, 2).label).toBe("Sep 11 to 12");
  });
});
