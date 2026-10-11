/**
 * How big a shop photo has to be, derived from the frame the print page actually gives it rather
 * than from one hard-coded number.
 *
 * The frame is cut to the photo's own shape, capped at 570 wide and 760 tall. So a 3:4 photo fills
 * 570 x 760 and a taller 2:3 photo is shown narrower, 507 x 760, never cropped. That means the
 * binding dimension changes with the shape: a wide photo is limited by its width, a tall one by its
 * height. A width-only rule therefore fails honest photos, which is exactly what happened to a
 * 1024 x 1536 room shot that was in fact sharp on the page.
 */

/**
 * The floor: what the hero frame needs on a 2x panel, HERO_MAX_WIDTH x HERO_MAX_HEIGHT doubled.
 * Below this the browser starts inventing pixels. It is the shape the page is designed around,
 * and for a long time it was also what Kenny exported, which is why one number did both jobs.
 */
export const SHOP_IMAGE_WIDTH = 1140;
export const SHOP_IMAGE_HEIGHT = 1520;

/**
 * What to export now (2026-10-11).
 *
 * Kenny's Etsy photos are 3000 x 2250: JPEG at quality 95, sRGB, 4:4:4, half a megabyte to two.
 * The quality bar is worth copying here; the 4:3 shape is not. Etsy's grid is landscape and the
 * print page is portrait, and because the frame is cut to the photo's own shape rather than
 * cropped, a 4:3 photo renders 570 x 428 where a 3:4 one renders 570 x 760 - the hero loses 44%
 * of its height. So: same export settings, portrait shape, twice the pixels the floor asks for,
 * which leaves headroom if the hero ever grows.
 */
export const SHOP_IMAGE_IDEAL_WIDTH = 2250;
export const SHOP_IMAGE_IDEAL_HEIGHT = 3000;

/** The print page's frame caps (app/prints/[slug]/shop-print-client.tsx). */
export const HERO_MAX_WIDTH = 570;
export const HERO_MAX_HEIGHT = 760;

/** Screens we design for. A 2x panel is the common case and the one that shows softness. */
export const HERO_PIXEL_RATIO = 2;

export interface Size {
  width: number;
  height: number;
}

/** The frame the print page gives a photo of this shape, in css pixels. */
export function heroFrame(ratio: number, maxWidth = HERO_MAX_WIDTH, maxHeight = HERO_MAX_HEIGHT): Size {
  if (!(ratio > 0)) return { width: maxWidth, height: maxHeight };
  const width = Math.min(maxWidth, maxHeight * ratio);
  return { width, height: width / ratio };
}

/**
 * The source pixels that frame needs before the browser starts inventing any. Rounded up, never
 * down: rounding a requirement down asks for fewer pixels than the frame actually paints.
 */
export function heroSourceNeeded(ratio: number, dpr = HERO_PIXEL_RATIO): Size {
  const frame = heroFrame(ratio);
  return { width: Math.ceil(frame.width * dpr), height: Math.ceil(frame.height * dpr) };
}

/** The shape at which the frame stops being limited by width and starts being limited by height. */
export const HERO_PIVOT_RATIO = HERO_MAX_WIDTH / HERO_MAX_HEIGHT;

/**
 * Whether a photo of these dimensions is big enough for the print page, and which dimension to talk
 * about when it is not.
 *
 * The requirement keeps the photo's own shape, so a photo that is short is short on both dimensions
 * by the same proportion. "Which one is short" is therefore not the useful question. What is useful
 * is which one is holding the frame back: a photo 3:4 or wider is capped by width, a taller one by
 * height. That is the number to change on the export.
 */
export function heroShortfall(size: Size): { needed: Size; short: "width" | "height" | null } {
  const ratio = size.width / size.height;
  const needed = heroSourceNeeded(ratio);
  if (size.width >= needed.width && size.height >= needed.height) return { needed, short: null };
  return { needed, short: ratio >= HERO_PIVOT_RATIO ? "width" : "height" };
}
