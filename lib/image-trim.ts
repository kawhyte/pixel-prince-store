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
  /**
   * Never crop below this width. Trimming throws pixels away, and a mockup that ends up
   * narrower than the box it is displayed in looks soft. The box grows back around its centre
   * until it reaches this, or the image runs out.
   */
  minWidth?: number;
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
  { tolerance = 12, marginPct = 0.08, step = 2, minWidth = 0 }: ContentBoxOptions = {},
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
  let x = Math.max(0, minX - padX);
  let y = Math.max(0, minY - padY);
  let w = Math.min(width - x, contentW + padX * 2);
  let h = Math.min(height - y, contentH + padY * 2);

  // Grow back around the centre rather than serve a crop too small for the page.
  const grow = Math.min(minWidth > 0 ? minWidth / w : 1, width / w, height / h);
  if (grow > 1) {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const nw = Math.min(width, Math.round(w * grow));
    const nh = Math.min(height, Math.round(h * grow));
    x = Math.round(Math.min(Math.max(0, cx - nw / 2), width - nw));
    y = Math.round(Math.min(Math.max(0, cy - nh / 2), height - nh));
    w = nw;
    h = nh;
  }
  if (w >= width && h >= height) return null;
  return { x, y, width: w, height: h };
}
