import { describe, it, expect } from "vitest";
import { versionsFromOffers } from "@/sanity/components/DefaultVersionInput";

describe("the Default version dropdown", () => {
  it("lists each version once, in offer order, so the editor picks instead of typing", () => {
    const offers = [
      { version: "Bright" },
      { version: "Bright" }, // the framed offer of the same version
      { version: "Earth" },
      { version: "Earth" },
    ];
    expect(versionsFromOffers(offers)).toEqual(["Bright", "Earth"]);
  });

  it("ignores blank and whitespace versions, and a print that has none", () => {
    expect(versionsFromOffers([{ version: "  Earth  " }, { version: "   " }, {}])).toEqual(["Earth"]);
    expect(versionsFromOffers([])).toEqual([]);
    expect(versionsFromOffers(undefined)).toEqual([]);
  });
});
