/**
 * The delivery promise as a date rather than a duration. "Arrives in 5 to 11 business days" makes
 * the reader do the arithmetic; "Get it by Sep 16 to 22" answers the question they actually have.
 *
 * The count is in **business days**: nothing is printed or shipped on a weekend or a US federal
 * holiday (Kenny, 2026-09-11). Counting calendar days quietly promised a Sunday arrival and, over
 * Thanksgiving or Christmas week, was out by the better part of a week.
 *
 * Everything is computed in UTC on purpose. The shop page is statically cached and revalidates on
 * the server, so the label is produced once per revalidation and handed to the client as a prop.
 * Using UTC on both sides keeps that value stable instead of shifting with whoever renders it.
 *
 * Known and accepted (Kenny, 2026-09-10): because the page is served from that cache, the first
 * visitor after midnight UTC can be handed the previous day's label while the refresh happens
 * behind them. That is one pageview a day at worst. Do not "fix" it by recomputing in the browser
 * after mount; the decision was to leave the date exactly as the server rendered it.
 */
import { DELIVERY_DAYS_MIN, DELIVERY_DAYS_MAX } from "@/config/support";
import { holidaySet, isBusinessDay } from "@/lib/us-holidays";

const DAY_MS = 86_400_000;

function parts(d: Date): { month: string; day: number } {
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(d),
    day: Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(d)),
  };
}

/**
 * `n` business days after `from`, skipping weekends and federal holidays.
 *
 * An order placed when nothing is running counts from when work next starts, so Saturday, Sunday
 * and Monday all give the same answer. Counting from the weekend itself made a Saturday order
 * look *faster* than a Monday one, which is the opposite of true.
 */
export function addBusinessDays(from: Date, n: number, holidays = holidaySet([from.getUTCFullYear()])): Date {
  let d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  while (!isBusinessDay(d, holidays)) d = new Date(d.getTime() + DAY_MS);
  let left = Math.max(0, Math.floor(n));
  while (left > 0) {
    d = new Date(d.getTime() + DAY_MS);
    if (isBusinessDay(d, holidays)) left--;
  }
  return d;
}

/** How many business days sit between two dates, for tests and for sanity checks. */
export function businessDaysBetween(from: Date, to: Date, holidays = holidaySet([from.getUTCFullYear(), to.getUTCFullYear()])): number {
  let count = 0;
  let d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
  const end = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate()));
  while (d < end) {
    d = new Date(d.getTime() + DAY_MS);
    if (isBusinessDay(d, holidays)) count++;
  }
  return count;
}

export interface DeliveryWindow {
  start: Date;
  end: Date;
  /** "Sep 16 to 22" inside one month, "Sep 29 to Oct 5" across two */
  label: string;
}

export function deliveryWindow(
  from: Date,
  minDays: number = DELIVERY_DAYS_MIN,
  maxDays: number = DELIVERY_DAYS_MAX,
): DeliveryWindow {
  // One holiday table for both ends, and for the year either side, so a window that crosses New
  // Year is counted with the same calendar as one that does not.
  const holidays = holidaySet([from.getUTCFullYear(), from.getUTCFullYear() + 1]);
  const start = addBusinessDays(from, minDays, holidays);
  const end = addBusinessDays(from, maxDays, holidays);
  const a = parts(start);
  const b = parts(end);
  const label = a.month === b.month ? `${a.month} ${a.day} to ${b.day}` : `${a.month} ${a.day} to ${b.month} ${b.day}`;
  return { start, end, label };
}
