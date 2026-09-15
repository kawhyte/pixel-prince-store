import { describe, it, expect } from "vitest";
import { pickHeroWall, HERO_WALL_COUNT } from "@/components/common/ShopHero/ShopHero";

const art = (id: string, category?: string) => ({ id, category });

describe("which prints hang in the hero", () => {
  it("avoids two from the same category", () => {
    // Newest-first put the retro controllers beside the retro consoles: same palette, same grid,
    // same beige, and together they read as one picture cut in half.
    const picked = pickHeroWall(
      [art("retro-controllers", "Video Games"), art("retro-consoles", "Video Games"), art("brooklyn", "Maps")],
      2,
    );
    expect(picked.map((p) => p.id)).toEqual(["retro-controllers", "brooklyn"]);
  });

  it("keeps the given order when the categories already differ", () => {
    const picked = pickHeroWall([art("a", "Maps"), art("b", "Video Games"), art("c", "Quotes")], 2);
    expect(picked.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("fills the wall anyway when everything shares a category", () => {
    // The rule is a preference, not a reason to show a gap.
    const picked = pickHeroWall([art("a", "Maps"), art("b", "Maps"), art("c", "Maps")], 2);
    expect(picked.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("treats a missing category as its own, and never repeats an item", () => {
    const picked = pickHeroWall([art("a"), art("b"), art("c", "Maps")], 2);
    expect(picked.map((p) => p.id)).toEqual(["a", "c"]);
    expect(new Set(picked.map((p) => p.id)).size).toBe(picked.length);
  });

  it("returns what it has when there are fewer prints than slots", () => {
    expect(pickHeroWall([art("a", "Maps")], 2).map((p) => p.id)).toEqual(["a"]);
    expect(pickHeroWall([], 2)).toEqual([]);
    expect(HERO_WALL_COUNT).toBe(2);
  });
});
