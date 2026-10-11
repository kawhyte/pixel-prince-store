import { describe, it, expect } from "vitest";

import { validateListingSpec } from "@/lib/listing-spec";

const good = {
  title: "Bronx Neighborhood Map",
  description: "The Bronx, neighborhood by neighborhood, color blocked so the whole borough reads at a glance.",
  longDescription: "Two paragraphs.\n\nPaper and sizes.",
  category: "Maps",
  tags: ["bronx", "nyc map", "map wall art"],
  rooms: ["office", "entryway"],
  defaultVersion: "Earth",
  popularSize: "18x24",
};

describe("validateListingSpec", () => {
  it("accepts a finished listing", () => {
    const r = validateListingSpec(good);
    expect(r.errors).toEqual([]);
    expect(r.spec?.title).toBe("Bronx Neighborhood Map");
  });

  it("names every problem at once", () => {
    const r = validateListingSpec({
      ...good,
      description: "A stunning print — perfect for any room.",
      category: "Sports",
      tags: ["Bronx"],
      rooms: ["kitchen"],
      popularSize: "12x16",
    });
    expect(r.spec).toBeNull();
    expect(r.errors.join("\n")).toContain("\u2014");
    expect(r.errors.join("\n")).toMatch(/stunning/);
    expect(r.errors.join("\n")).toMatch(/category/);
    expect(r.errors.join("\n")).toMatch(/lowercase/);
    expect(r.errors.join("\n")).toMatch(/kitchen/);
    expect(r.errors.join("\n")).toMatch(/popularSize/);
  });

  it("warns on a title Google will cut", () => {
    const r = validateListingSpec({ ...good, title: "The Complete Bronx Neighborhood Map Poster" });
    expect(r.errors).toEqual([]);
    expect(r.warnings[0]).toMatch(/characters/);
  });
});
