/**
 * The rule these pin (PLAN-52, and two regressions on 2026-09-11): adding a print must not
 * change a print that already exists. Photos and copy are Kenny's, and "empty" is one of his
 * answers, not a gap for a script to fill.
 *
 * These read the scripts themselves, because the behaviour lives in them rather than in a
 * function anyone can call. It is a blunt test and it caught exactly the mistake twice.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const read = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("a sync leaves an existing print alone", () => {
  const source = read("scripts/import-fourthwall-products.ts");

  it("writes an offer photo only on an explicit --reset-images", () => {
    // The regression: `if (!offer.hasMockup || resetImages)` refilled a mockup someone cleared.
    expect(source).not.toMatch(/if\s*\(\s*!offer\.hasMockup\s*\|\|\s*resetImages\s*\)/);
    expect(source).toMatch(/if\s*\(resetImages\)\s*\{[\s\S]{0,400}?uploadFirstImage/);
  });

  it("writes room photos only on an explicit --reset-images", () => {
    expect(source).toMatch(/shouldReplaceGallery\(\{\s*resetImages/);
    expect(source).not.toMatch(/!doc\.galleryCount\s*\|\|\s*resetImages/);
  });

  it("never rewrites the words on an existing print", () => {
    // Studio owns these. They are written once, when the draft is created, and never again.
    const existingBranch = source.slice(source.indexOf("if (existing.length > 0)"), source.indexOf("if (syncOnly)"));
    for (const field of ["description:", "longDescription:", "tags:", "category:", "title:", "previewImage:"]) {
      expect(existingBranch).not.toContain(field);
    }
  });
});

describe("the artwork run is additive", () => {
  const source = read("scripts/upload-flat-art.ts");

  it("fills an empty card image and never replaces one that is set", () => {
    expect(source).toMatch(/replacePreview\s*\|\|\s*!doc\.hasPreviewImage/);
    expect(source).toMatch(/--replace-preview/);
  });

  it("fills artwork only where there is none, unless told otherwise", () => {
    // hasArt used to be queried and then ignored, so every run rewrote every print.
    expect(source).toMatch(/replaceArt\s*\?\s*offers\s*:\s*offers\.filter\(\(o\)\s*=>\s*!o\.hasArt\)/);
    expect(source).toMatch(/--replace-art/);
  });
});
