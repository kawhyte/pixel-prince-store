import { describe, it, expect } from "vitest";
import { federalHolidays, isBusinessDay, holidaySet, nthWeekday, observed, utcDay } from "@/lib/us-holidays";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const on = (year: number, name: string) => iso(federalHolidays(year).find((h) => h.name === name)!.date);

describe("federal holidays", () => {
  it("computes the eleven, rather than listing dates that quietly expire", () => {
    expect(federalHolidays(2026)).toHaveLength(11);
    expect(federalHolidays(2030)).toHaveLength(11);
  });

  it("gets the moving ones right, checked against the published dates", () => {
    expect(on(2026, "Martin Luther King Jr. Day")).toBe("2026-01-19"); // 3rd Monday
    expect(on(2026, "Washington's Birthday")).toBe("2026-02-16");
    expect(on(2026, "Memorial Day")).toBe("2026-05-25"); // last Monday
    expect(on(2026, "Labor Day")).toBe("2026-09-07"); // 1st Monday
    expect(on(2026, "Columbus Day")).toBe("2026-10-12"); // 2nd Monday
    expect(on(2026, "Thanksgiving")).toBe("2026-11-26"); // 4th Thursday
    expect(on(2027, "Thanksgiving")).toBe("2027-11-25");
    expect(on(2027, "Memorial Day")).toBe("2027-05-31");
  });

  it("moves a fixed holiday to the weekday it is observed on", () => {
    // 4 Jul 2026 is a Saturday, observed the Friday before
    expect(on(2026, "Independence Day")).toBe("2026-07-03");
    // 4 Jul 2027 is a Sunday, observed the Monday after
    expect(on(2027, "Independence Day")).toBe("2027-07-05");
    // 25 Dec 2026 is a Friday, so it stays put
    expect(on(2026, "Christmas Day")).toBe("2026-12-25");
    expect(iso(observed(utcDay(2027, 12, 25)))).toBe("2027-12-24"); // Sat -> Fri
  });

  it("finds a New Year observed in the previous December", () => {
    // 1 Jan 2028 is a Saturday, so it is observed Fri 31 Dec 2027
    expect(on(2028, "New Year's Day")).toBe("2027-12-31");
    // and a set built for 2027 still contains it, because the year either side is included
    expect(holidaySet([2027]).get("2027-12-31")).toBe("New Year's Day");
  });

  it("handles last-weekday and nth-weekday arithmetic at month edges", () => {
    expect(iso(nthWeekday(2026, 5, 1, -1))).toBe("2026-05-25"); // last Monday of May
    expect(iso(nthWeekday(2026, 2, 0, 1))).toBe("2026-02-01"); // 1st Sunday, which is the 1st
    expect(iso(nthWeekday(2027, 1, 5, 1))).toBe("2027-01-01"); // 1st Friday, which is the 1st
  });
});

describe("isBusinessDay", () => {
  it("rejects weekends and holidays, accepts ordinary weekdays", () => {
    const h = holidaySet([2026]);
    expect(isBusinessDay(utcDay(2026, 9, 10), h)).toBe(true); // Thursday
    expect(isBusinessDay(utcDay(2026, 9, 12), h)).toBe(false); // Saturday
    expect(isBusinessDay(utcDay(2026, 9, 13), h)).toBe(false); // Sunday
    expect(isBusinessDay(utcDay(2026, 9, 7), h)).toBe(false); // Labor Day
    expect(isBusinessDay(utcDay(2026, 7, 3), h)).toBe(false); // Independence Day observed
    expect(isBusinessDay(utcDay(2026, 7, 6), h)).toBe(true);
  });
});
