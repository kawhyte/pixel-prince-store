import { describe, it, expect } from "vitest";
import { NAV_PRIMARY, SETS_HREF, primaryNav } from "@/config/nav";

describe("Sets in the navigation", () => {
  it("is absent while there is nothing behind it", () => {
    // A permanent link to an empty grid is worse than no link: someone clicked it wanting to buy.
    const links = primaryNav(0).map((l) => l.href);
    expect(links).not.toContain(SETS_HREF);
    expect(links).toContain("/prints");
  });

  it("returns on its own the day a set is published, with nothing to remember", () => {
    expect(primaryNav(1).map((l) => l.href)).toContain(SETS_HREF);
    expect(primaryNav(1)).toEqual(NAV_PRIMARY);
  });

  it("drops only Sets, and keeps the order of the rest", () => {
    expect(primaryNav(0)).toEqual(NAV_PRIMARY.filter((l) => l.href !== SETS_HREF));
  });
});
