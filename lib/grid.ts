/**
 * Card grid sizing, shared by the homepage rows and the collection pages.
 *
 * Both were built for four cards. With fewer, a four-column grid leaves holes and a lone card
 * floats at the left of an empty row, which reads as a page that failed to load rather than a
 * catalogue that is still small. Narrowing the row instead keeps it deliberate.
 *
 * `gridSizes` has to follow `gridClass`, or the browser asks for the wrong width: at one or two
 * cards the row is a fixed max-width rather than a fraction of the viewport, and calling it 25vw
 * under-states it and fetches an image too small for the box.
 */

export function gridClass(count: number, base = "grid gap-y-8 gap-x-10 md:gap-y-10 md:gap-x-14"): string {
  if (count >= 4) return `${base} sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`;
  if (count === 3) return `${base} sm:grid-cols-2 lg:grid-cols-3`;
  if (count === 2) return `${base} max-w-3xl sm:grid-cols-2`;
  return `${base} max-w-sm`;
}

export function gridSizes(count: number): string {
  if (count >= 4) return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw";
  if (count === 3) return "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw";
  return "(max-width: 640px) 100vw, 384px";
}
