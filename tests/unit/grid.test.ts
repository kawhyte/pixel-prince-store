import { describe, it, expect } from "vitest";
import { gridClass, gridSizes } from "@/lib/grid";

describe("card grids narrow rather than leave holes", () => {
  it("uses every column only when there are cards to fill them", () => {
    expect(gridClass(4)).toContain("xl:grid-cols-4");
    expect(gridClass(9)).toContain("xl:grid-cols-4");
    expect(gridClass(3)).toContain("lg:grid-cols-3");
    expect(gridClass(3)).not.toContain("grid-cols-4");
  });

  it("caps the row instead of stranding one or two cards in an empty one", () => {
    // A lone card at the left of a four-column row reads as a page that failed to load.
    expect(gridClass(2)).toContain("max-w-3xl");
    expect(gridClass(1)).toContain("max-w-sm");
    expect(gridClass(0)).toContain("max-w-sm");
  });

  it("keeps the sizes hint honest about the narrowed row", () => {
    // At one or two cards the row is a fixed width, so a viewport fraction under-states the box
    // and the browser fetches an image too small for it.
    expect(gridSizes(4)).toContain("25vw");
    expect(gridSizes(3)).toContain("33vw");
    expect(gridSizes(2)).toContain("384px");
    expect(gridSizes(1)).toContain("384px");
  });
});
