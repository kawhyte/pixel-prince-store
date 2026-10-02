/**
 * How big a shop photo has to be, derived from the frame the print page actually gives it rather
 * than from one hard-coded number.
 *
 * The frame is cut to the photo's own shape, capped at 720 wide and 760 tall. So a 4:3 mockup fills
 * 720 x 540, a 3:4 photo is shown at 570 x 760 and a taller 2:3 one narrower still, 507 x 760, never
 * cropped. That means the
 * binding dimension changes with the shape: a wide photo is limited by its width, a tall one by its
 * height. A width-only rule therefore fails honest photos, which is exactly what happened to a
 * 1024 x 1536 room shot that was in fact sharp on the page.
 */

/**
 * The full-size Etsy mockup originals (MOCKUPS/<Design>/_hq/), 4:3 landscape. Upload these as they
 * are: Next.js makes the smaller copies, so a pre-shrunk or Etsy-CDN copy only loses detail.
 */
export const SHOP_IMAGE_WIDTH = 3000;
export const SHOP_IMAGE_HEIGHT = 2250;

/**
 * The print page's frame caps (app/prints/[slug]/shop-print-client.tsx). 720 from xl up; between lg
 * and xl the column stops at HERO_MAX_WIDTH_LG so the buy stack keeps its room.
 */
export const HERO_MAX_WIDTH = 720;
export const HERO_MAX_WIDTH_LG = 570;
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
 * is which one is holding the frame back: a photo wider than 720:760 is capped by width, a taller one by
 * height. That is the number to change on the export.
 */
export function heroShortfall(size: Size): { needed: Size; short: "width" | "height" | null } {
  const ratio = size.width / size.height;
  const needed = heroSourceNeeded(ratio);
  if (size.width >= needed.width && size.height >= needed.height) return { needed, short: null };
  return { needed, short: ratio >= HERO_PIVOT_RATIO ? "width" : "height" };
}
