/**
 * The delivery promise as a date rather than a duration. "Arrives in 5 to 11 days" makes the reader
 * do the arithmetic; "Get it by Sep 15 to 21" answers the question they actually have.
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

const DAY_MS = 86_400_000;

function parts(d: Date): { month: string; day: number } {
  return {
    month: new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(d),
    day: Number(new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(d)),
  };
}

export interface DeliveryWindow {
  start: Date;
  end: Date;
  /** "Sep 15 to 21" inside one month, "Sep 29 to Oct 5" across two */
  label: string;
}

export function deliveryWindow(
  from: Date,
  minDays: number = DELIVERY_DAYS_MIN,
  maxDays: number = DELIVERY_DAYS_MAX,
): DeliveryWindow {
  const start = new Date(from.getTime() + minDays * DAY_MS);
  const end = new Date(from.getTime() + maxDays * DAY_MS);
  const a = parts(start);
  const b = parts(end);
  const label = a.month === b.month ? `${a.month} ${a.day} to ${b.day}` : `${a.month} ${a.day} to ${b.month} ${b.day}`;
  return { start, end, label };
}
