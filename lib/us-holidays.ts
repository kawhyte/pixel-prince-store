/**
 * US federal holidays, the days nothing ships.
 *
 * Computed per year rather than listed, because a hardcoded table expires quietly: it keeps
 * answering, it just starts answering last year's question. Six of the eleven move every year.
 *
 * Everything is UTC, matching `lib/delivery.ts`, so the answer does not shift with whoever is
 * rendering it.
 */

/** UTC midnight for a calendar day. */
export function utcDay(year: number, month1: number, day: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day));
}

/** The nth <weekday> of a month, e.g. the 3rd Monday of January. `n = -1` means the last one. */
export function nthWeekday(year: number, month1: number, weekday: number, n: number): Date {
  if (n < 0) {
    const last = new Date(Date.UTC(year, month1, 0)); // day 0 of next month = last of this one
    const back = (last.getUTCDay() - weekday + 7) % 7;
    return new Date(Date.UTC(year, month1 - 1, last.getUTCDate() - back));
  }
  const first = utcDay(year, month1, 1);
  const forward = (weekday - first.getUTCDay() + 7) % 7;
  return utcDay(year, month1, 1 + forward + (n - 1) * 7);
}

/**
 * A fixed-date holiday is observed on the nearest weekday: Saturday moves back to Friday, Sunday
 * forward to Monday. The carriers do this, so the shop has to as well.
 */
export function observed(date: Date): Date {
  const day = date.getUTCDay();
  if (day === 6) return new Date(date.getTime() - 86_400_000);
  if (day === 0) return new Date(date.getTime() + 86_400_000);
  return date;
}

export interface Holiday {
  name: string;
  date: Date;
}

/** The eleven federal holidays for one year, already shifted to the day they are observed. */
export function federalHolidays(year: number): Holiday[] {
  const fixed: [string, number, number][] = [
    ["New Year's Day", 1, 1],
    ["Juneteenth", 6, 19],
    ["Independence Day", 7, 4],
    ["Veterans Day", 11, 11],
    ["Christmas Day", 12, 25],
  ];
  const floating: [string, number, number, number][] = [
    ["Martin Luther King Jr. Day", 1, 1, 3], // 3rd Monday in January
    ["Washington's Birthday", 2, 1, 3], // 3rd Monday in February
    ["Memorial Day", 5, 1, -1], // last Monday in May
    ["Labor Day", 9, 1, 1], // 1st Monday in September
    ["Columbus Day", 10, 1, 2], // 2nd Monday in October
    ["Thanksgiving", 11, 4, 4], // 4th Thursday in November
  ];

  const out: Holiday[] = [
    ...fixed.map(([name, m, d]) => ({ name, date: observed(utcDay(year, m, d)) })),
    ...floating.map(([name, m, wd, n]) => ({ name, date: nthWeekday(year, m, wd, n) })),
  ];
  return out.sort((a, b) => a.date.getTime() - b.date.getTime());
}

const key = (d: Date) => d.toISOString().slice(0, 10);

/**
 * A lookup for the years touched by a window. New Year's Day observed can land in the previous
 * December, so the year either side is included rather than assumed away.
 */
export function holidaySet(years: number[]): Map<string, string> {
  const span = new Set<number>();
  for (const y of years) {
    span.add(y - 1);
    span.add(y);
    span.add(y + 1);
  }
  const map = new Map<string, string>();
  for (const y of span) for (const h of federalHolidays(y)) map.set(key(h.date), h.name);
  return map;
}

/** Saturday, Sunday, or a federal holiday: nothing moves. */
export function isBusinessDay(date: Date, holidays: Map<string, string> = holidaySet([date.getUTCFullYear()])): boolean {
  const day = date.getUTCDay();
  if (day === 0 || day === 6) return false;
  return !holidays.has(key(date));
}

export { key as isoDay };
