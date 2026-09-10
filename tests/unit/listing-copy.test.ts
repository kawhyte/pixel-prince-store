import { describe, it, expect } from "vitest";
import { draftDescription, draftLongDescription, draftTags } from "@/lib/listing-copy";

describe("listing copy", () => {
  it("writes a description that fits Sanity's 200 character cap", () => {
    const short = draftDescription({ title: "Brooklyn Neighborhood Map", category: "Maps", versions: ["Earth", "Bright"] });
    expect(short.length).toBeLessThanOrEqual(200);
    expect(short).toContain("Brooklyn Neighborhood Map");
    expect(short).toContain("Earth or Bright");

    const long = draftDescription({ title: "A".repeat(300), category: "Maps" });
    expect(long.length).toBeLessThanOrEqual(200);
    expect(long.endsWith("...")).toBe(true);
  });

  it("falls back for a category it does not know, and for a print with one version", () => {
    const copy = draftDescription({ title: "Sweden Map" });
    expect(copy).toContain("Sweden Map");
    expect(copy).not.toContain("undefined");
    expect(copy).not.toMatch(/ or \./);
  });

  it("mentions the versions and finishes actually on sale", () => {
    const body = draftLongDescription({
      title: "Brooklyn Neighborhood Map",
      category: "Maps",
      versions: ["Earth", "Bright"],
      finishes: ["unframed", "framed"],
    });
    expect(body).toContain("2 colorways");
    expect(body).toContain("Earth and Bright");
    expect(body).toContain("unframed or framed");
    expect(body.split("\n\n")).toHaveLength(2);

    // a print with one version and one finish makes no claims about choice
    const plain = draftLongDescription({ title: "Sweden Map", finishes: ["unframed"] });
    expect(plain).not.toContain("colorways");
    expect(plain).not.toContain("Pick it");
  });

  it("never writes an em dash, which the house rule bans", () => {
    const all = [
      draftDescription({ title: "Brooklyn Neighborhood Map", category: "Maps" }),
      draftLongDescription({ title: "Brooklyn Neighborhood Map", category: "Maps", versions: ["Earth", "Bright"] }),
    ].join(" ");
    expect(all).not.toContain("—");
  });

  it("builds tags from the title and category, without filler words", () => {
    expect(draftTags({ title: "Brooklyn Neighborhood Map", category: "Maps" })).toEqual([
      "brooklyn",
      "neighborhood",
      "map",
      "maps",
      "wall art",
    ]);
    expect(draftTags({ title: "The Art of the Wall Print" })).toEqual(["maps"].slice(0, 0).concat(["wall art"]));
  });
});

describe("image naming", () => {
  it("writes alt text from what is true about the product", async () => {
    const { imageAlt } = await import("@/lib/listing-copy");
    expect(imageAlt({ title: "Brooklyn Neighborhood Map", version: "Earth", finish: "framed", kind: "main" })).toBe(
      "Brooklyn Neighborhood Map wall art print, Earth colorway, in a black wood frame"
    );
    expect(imageAlt({ title: "Brooklyn Neighborhood Map", version: "Earth", finish: "unframed", kind: "room", index: 2 })).toBe(
      "Brooklyn Neighborhood Map wall art print shown on a wall, Earth colorway, view 2"
    );
    // a print with one version and no frame says neither
    expect(imageAlt({ title: "Sweden Map", kind: "main" })).toBe("Sweden Map wall art print");
    expect(imageAlt({ title: "Sweden Map", finish: "canvas", kind: "main" })).toContain("gallery wrapped canvas");
  });

  it("builds a file name that is readable and free of repetition", async () => {
    const { imageFileName } = await import("@/lib/listing-copy");
    expect(imageFileName({ title: "Brooklyn Neighborhood Map", version: "Earth", finish: "framed", kind: "main" })).toBe(
      "brooklyn-neighborhood-map-earth-framed.webp"
    );
    expect(imageFileName({ title: "Brooklyn Neighborhood Map", version: "Earth", finish: "unframed", kind: "main" })).toBe(
      "brooklyn-neighborhood-map-earth.webp"
    );
    expect(imageFileName({ title: "Brooklyn Neighborhood Map", version: "Bright", finish: "framed", kind: "room", index: 2 }, "png")).toBe(
      "brooklyn-neighborhood-map-bright-framed-wall-2.png"
    );
  });
});
