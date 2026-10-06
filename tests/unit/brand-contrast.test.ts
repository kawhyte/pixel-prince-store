import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The terracotta accent is used for small text (section labels, links, prices) on cream and on
// the pale peach band. WCAG AA asks 4.5:1 for small text; PageSpeed flags anything under it.
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const token = (name: string) => {
  const m = css.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  if (!m) throw new Error(`token --${name} not found`);
  return m[1];
};

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe("brand accent contrast", () => {
  const accent = token("color-sage-500");
  it.each([
    ["cream", token("color-cream")],
    ["peach band", token("color-sage-50")],
    ["white card", "#ffffff"],
  ])("terracotta text on %s passes AA", (_, bg) => {
    expect(contrast(accent, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("white text on terracotta buttons passes AA", () => {
    expect(contrast("#ffffff", token("primary"))).toBeGreaterThanOrEqual(4.5);
  });
});
