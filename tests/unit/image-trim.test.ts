import { describe, it, expect } from "vitest";
import { contentBox } from "@/lib/image-trim";

/** White canvas with a solid black rectangle, the shape of a Fourthwall mockup. */
function canvas(w: number, h: number, rect?: { x: number; y: number; width: number; height: number }) {
  const d = new Uint8ClampedArray(w * h * 4).fill(255);
  if (rect) {
    for (let y = rect.y; y < rect.y + rect.height; y++) {
      for (let x = rect.x; x < rect.x + rect.width; x++) {
        const i = (y * w + x) * 4;
        d[i] = 0;
        d[i + 1] = 0;
        d[i + 2] = 0;
      }
    }
  }
  return d;
}

describe("contentBox", () => {
  it("finds the product and leaves a margin around it", () => {
    const box = contentBox(canvas(200, 200, { x: 60, y: 50, width: 80, height: 100 }), 200, 200, { step: 1, marginPct: 0.1 });
    // content is 80x100, so the margin is 8 and 10 on each side
    expect(box).toEqual({ x: 52, y: 40, width: 96, height: 120 });
  });

  it("clamps the margin to the image edges", () => {
    // the corner pixel is the background sample, so the product never starts at 0,0
    const box = contentBox(canvas(100, 100, { x: 5, y: 5, width: 88, height: 88 }), 100, 100, { step: 1, marginPct: 0.5 });
    expect(box).toEqual({ x: 0, y: 0, width: 100, height: 100 });
  });

  it("returns null for an empty image and for one already full of content", () => {
    expect(contentBox(canvas(50, 50), 50, 50, { step: 1 })).toBeNull();
    expect(contentBox(canvas(50, 50, { x: 1, y: 1, width: 48, height: 48 }), 50, 50, { step: 1 })).toBeNull();
    expect(contentBox(new Uint8ClampedArray(0), 0, 0)).toBeNull();
  });

  it("treats near background pixels as background, so a soft shadow does not defeat the trim", () => {
    const d = canvas(100, 100, { x: 40, y: 40, width: 20, height: 20 });
    // a faint halo around the product, within tolerance
    for (let y = 30; y < 70; y++) for (let x = 30; x < 70; x++) {
      const i = (y * 100 + x) * 4;
      if (d[i] === 255) { d[i] = 249; d[i + 1] = 249; d[i + 2] = 249; }
    }
    const box = contentBox(d, 100, 100, { step: 1, marginPct: 0 });
    expect(box).toEqual({ x: 40, y: 40, width: 20, height: 20 });
  });
});

describe("photographs are left alone", () => {
  it("does not trim when the picture runs off an edge, the way a room photo does", () => {
    // a print floating on a flat background: a generated mockup, safe to trim
    expect(contentBox(canvas(100, 100, { x: 30, y: 30, width: 40, height: 40 }), 100, 100, { step: 1 })).not.toBeNull();

    // the same print with a plant running off the bottom edge: a photograph, leave it
    const photo = canvas(100, 100, { x: 30, y: 30, width: 40, height: 40 });
    for (let y = 70; y < 100; y++) for (let x = 5; x < 25; x++) {
      const i = (y * 100 + x) * 4;
      photo[i] = 20; photo[i + 1] = 90; photo[i + 2] = 40;
    }
    expect(contentBox(photo, 100, 100, { step: 1 })).toBeNull();
  });
});
