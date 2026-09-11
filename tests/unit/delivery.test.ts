import { describe, it, expect } from "vitest";
import { addBusinessDays, businessDaysBetween, deliveryWindow } from "@/lib/delivery";
import { DELIVERY_DAYS_MIN, DELIVERY_DAYS_MAX, DELIVERY_WINDOW } from "@/config/support";

const at = (iso: string) => new Date(`${iso}T12:00:00Z`);

describe("delivery window", () => {
  it("counts business days, so the promise never lands on a weekend", () => {
    // Thu 10 Sep 2026: 5 business days is Thu 17th, 11 is Fri 25th. Calendar days said 15 to 21,
    // and the 20th was a Sunday.
    expect(deliveryWindow(at("2026-09-10")).label).toBe("Sep 17 to 25");
    for (const iso of ["2026-09-10", "2026-11-02", "2027-01-04"]) {
      const w = deliveryWindow(at(iso));
      expect([0, 6]).not.toContain(w.start.getUTCDay());
      expect([0, 6]).not.toContain(w.end.getUTCDay());
    }
  });

  it("does not start the clock on a day nothing happens", () => {
    // Ordering Saturday and ordering the Monday after give the same answer: work starts Monday.
    expect(deliveryWindow(at("2026-09-12")).label).toBe(deliveryWindow(at("2026-09-14")).label);
    // Sunday too.
    expect(deliveryWindow(at("2026-09-13")).label).toBe(deliveryWindow(at("2026-09-14")).label);
  });

  it("skips federal holidays, which is where calendar days were worst", () => {
    // Thanksgiving 2026 is Thu 26 Nov. Ordering Mon 23 Nov, 5 business days skips it and the
    // weekend and lands Tue 1 Dec. Five calendar days said Sat 28 Nov: a weekend, during the
    // week the carriers are slowest.
    const w = deliveryWindow(at("2026-11-23"), 5, 5);
    expect(w.start.toISOString().slice(0, 10)).toBe("2026-12-01");
    // Christmas Day 2026 is a Friday, so it is observed on the day itself.
    expect(addBusinessDays(at("2026-12-23"), 1).toISOString().slice(0, 10)).toBe("2026-12-24");
    expect(addBusinessDays(at("2026-12-24"), 1).toISOString().slice(0, 10)).toBe("2026-12-28");
  });

  it("honours a holiday observed on a different day than it falls", () => {
    // 4 July 2026 is a Saturday, so it is observed Friday 3 July: that Friday does not count.
    expect(addBusinessDays(at("2026-07-02"), 1).toISOString().slice(0, 10)).toBe("2026-07-06");
    // 1 Jan 2028 is a Saturday, observed Friday 31 Dec 2027, which is the previous year.
    expect(addBusinessDays(at("2027-12-30"), 1).toISOString().slice(0, 10)).toBe("2028-01-03");
  });

  it("names the second month when the window crosses one, and the year end", () => {
    expect(deliveryWindow(at("2026-09-24")).label).toBe("Oct 1 to 9");
    expect(deliveryWindow(at("2026-12-28")).label).toBe("Jan 5 to 13");
  });

  it("counts from the promise in config/support, not from numbers typed here", () => {
    const from = at("2026-03-02"); // a Monday, no holidays that fortnight
    const w = deliveryWindow(from);
    expect(businessDaysBetween(from, w.start)).toBe(DELIVERY_DAYS_MIN);
    expect(businessDaysBetween(from, w.end)).toBe(DELIVERY_DAYS_MAX);
    expect(DELIVERY_WINDOW).toBe(`${DELIVERY_DAYS_MIN} to ${DELIVERY_DAYS_MAX} business days`);
  });

  it("is stable whatever the renderer's clock zone, because it works in UTC", () => {
    expect(deliveryWindow(new Date("2026-09-10T23:59:59Z")).label).toBe(deliveryWindow(at("2026-09-10")).label);
  });

  it("takes an override, so a different promise does not need a code change here", () => {
    // Thu 10 Sep, 1 and 2 business days: Fri 11th and Mon 14th.
    expect(deliveryWindow(at("2026-09-10"), 1, 2).label).toBe("Sep 11 to 14");
  });
});
