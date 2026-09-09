/**
 * Find the product inside a mockup (PLAN-50). Fourthwall renders every mockup on a flat
 * background with a wide dead margin: a framed poster fills about 62% of the width and 55%
 * of the height, so the print reads small however big the container is. Trimming to the
 * content at import time fixes the hero, the tiles and the thumbnails at once.
 *
 * Pure so it can be unit tested; the pixels come from a canvas in the import script.
 */

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ContentBoxOptions {
  /** How far a channel may drift from the background before a pixel counts as content. */
  tolerance?: number;
  /** Breathing room to leave around the content, as a share of the content box. */
  marginPct?: number;
  /** Sample every nth pixel. 2 is plenty for a 1536px render and four times faster. */
  step?: number;
}

/**
 * Bounding box of everything that is not the background colour, padded by `marginPct` and
 * clamped to the image. The background is taken from the top-left pixel, which is what every
 * Fourthwall render has. Returns null when the picture is a photograph rather than a generated
 * mockup (anything touching an edge), when the image is entirely background, or when the content
 * already fills more than 92% of both sides so trimming would gain nothing.
 */
export function contentBox(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  { tolerance = 12, marginPct = 0.08, step = 2 }: ContentBoxOptions = {},
): Box | null {
  if (width <= 0 || height <= 0 || data.length < 4) return null;
  const [br, bg, bb] = [data[0], data[1], data[2]];
  const isBg = (i: number) =>
    Math.abs(data[i] - br) <= tolerance && Math.abs(data[i + 1] - bg) <= tolerance && Math.abs(data[i + 2] - bb) <= tolerance;

  // Only a generated mockup gets trimmed. Those float the product in the middle with a flat
  // background on all four edges; a photograph has the wall, a surface or a prop running off
  // the frame, so any edge that is not background means "leave this picture alone".
  let edgeChecked = 0;
  let edgeForeign = 0;
  for (let x = 0; x < width; x += step) {
    for (const y of [0, height - 1]) {
      edgeChecked++;
      if (!isBg((y * width + x) * 4)) edgeForeign++;
    }
  }
  for (let y = 0; y < height; y += step) {
    for (const x of [0, width - 1]) {
      edgeChecked++;
      if (!isBg((y * width + x) * 4)) edgeForeign++;
    }
  }
  if (edgeChecked === 0 || edgeForeign / edgeChecked > 0.02) return null;

  let minX = width;
  let maxX = -1;
  let minY = height;
  let maxY = -1;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const i = (y * width + x) * 4;
      if (isBg(i)) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0 || maxY < 0) return null;

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  if (contentW / width > 0.92 && contentH / height > 0.92) return null;

  const padX = Math.round(contentW * marginPct);
  const padY = Math.round(contentH * marginPct);
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  return {
    x,
    y,
    width: Math.min(width - x, contentW + padX * 2),
    height: Math.min(height - y, contentH + padY * 2),
  };
}
