/**
 * Which sizes a master prints at, derived from its pixels rather than typed per artwork.
 *
 * A master is portrait or landscape, and the ladder has to follow it. It did not: the page asked
 * `deriveRatio` and then fell back to the portrait ladder whenever the answer was null, so three
 * landscape prints told the reader to buy an 8x10 portrait frame their print does not fit.
 * `deriveRatio` returning null means "this crop is not one we print", and a caller must treat it
 * as that rather than as a missing value to paper over.
 */
export type ArtRatio = "4:5" | "5:4";

export interface PrintSize {
  label: string; // e.g. '4×5″'
  cm: string; // e.g. '10×13 cm'
  fits: string; // e.g. 'Small frames, desk display'
}

export const PRINT_SIZES: Record<ArtRatio, PrintSize[]> = {
  "4:5": [
    { label: '4×5″', cm: "10×13 cm", fits: "Small frames, desk display" },
    { label: '8×10″', cm: "20×25 cm", fits: "The classic frame size" },
    { label: '16×20″', cm: "40×50 cm", fits: "Statement pieces" },
  ],
  // The same ladder turned on its side. Same frames, same shops, hung the other way.
  "5:4": [
    { label: '5×4″', cm: "13×10 cm", fits: "Small frames, desk display" },
    { label: '10×8″', cm: "25×20 cm", fits: "The classic frame size" },
    { label: '20×16″', cm: "50×40 cm", fits: "Statement pieces" },
  ],
};

/** The tolerance either side of 0.8, wide enough for a crop a pixel or two off square. */
const MIN = 0.76;
const MAX = 0.84;

/**
 * Derive the ratio from pixel dimensions; null when the crop is neither 4:5 portrait nor its
 * landscape mirror. Null is an answer, not an absence: do not default it to a ladder.
 */
export function deriveRatio(width: number, height: number): ArtRatio | null {
  if (!(width > 0) || !(height > 0)) return null;
  const r = width / height;
  if (r >= MIN && r <= MAX) return "4:5";
  if (r >= 1 / MAX && r <= 1 / MIN) return "5:4";
  return null;
}

/** True when the master is wider than it is tall. */
export function isLandscape(ratio: ArtRatio): boolean {
  return ratio === "5:4";
}

/**
 * Minimum master resolution: 300dpi at the largest size on the ladder (16×20 or 20×16). The long
 * edge carries 6000 px whichever way up the art is.
 */
export const MIN_MASTER_LONG_EDGE = 6000;
export const MIN_MASTER_SHORT_EDGE = 4800;
export const MIN_MASTER_WIDTH = MIN_MASTER_SHORT_EDGE;
export const MIN_MASTER_HEIGHT = MIN_MASTER_LONG_EDGE;

/** Whether a master carries enough pixels for the whole ladder, whichever way up it is. */
export function meetsMasterResolution(width: number, height: number): boolean {
  return Math.max(width, height) >= MIN_MASTER_LONG_EDGE && Math.min(width, height) >= MIN_MASTER_SHORT_EDGE;
}
