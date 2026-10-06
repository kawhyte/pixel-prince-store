import { describe, expect, it } from "vitest";
import { COLLECTIONS } from "@/config/collections";
import { buildSitemap } from "@/lib/sitemap";
import robots from "@/app/robots";

const SITE = "https://www.thepixelprince.com";
const urls = (entries: { url: string }[]) => entries.map((e) => e.url);

describe("buildSitemap", () => {
  it("lists prints, free art and posts from Sanity at their own paths", () => {
    const list = urls(
      buildSitemap({
        shop: [{ slug: "brooklyn-neighborhood-map" }],
        free: [{ slug: "ethereal-dreams" }],
        posts: [{ slug: "how-to-frame" }],
      })
    );
    expect(list).toContain(`${SITE}/prints/brooklyn-neighborhood-map`);
    expect(list).toContain(`${SITE}/art/ethereal-dreams`);
    expect(list).toContain(`${SITE}/blog/how-to-frame`);
  });

  it("lists every collection, so a new one cannot be forgotten", () => {
    const list = urls(buildSitemap(null));
    for (const c of COLLECTIONS) expect(list).toContain(`${SITE}/collections/${c.slug}`);
  });

  it("still lists the fixed pages when Sanity is unreachable", () => {
    const list = urls(buildSitemap(null));
    expect(list).toContain(SITE);
    expect(list).toContain(`${SITE}/prints`);
    expect(list).toContain(`${SITE}/shipping-returns`);
  });

  it("carries Sanity's update time as lastModified and skips docs without a slug", () => {
    const entries = buildSitemap({
      shop: [{ slug: "a", updatedAt: "2026-10-01T00:00:00Z" }, { slug: "" }],
      free: [],
      posts: [],
    });
    const a = entries.find((e) => e.url === `${SITE}/prints/a`);
    expect(a?.lastModified).toEqual(new Date("2026-10-01T00:00:00Z"));
    expect(urls(entries).filter((u) => u.startsWith(`${SITE}/prints/`))).toHaveLength(1);
  });

  it("never lists Studio or the API", () => {
    const list = urls(buildSitemap({ shop: [{ slug: "a" }], free: [{ slug: "b" }], posts: [] }));
    expect(list.some((u) => u.includes("/studio") || u.includes("/api"))).toBe(false);
  });
});

describe("robots", () => {
  it("blocks Studio and the API and points at both sitemaps", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    expect(rules.disallow).toEqual(expect.arrayContaining(["/studio", "/api/"]));
    expect(r.sitemap).toEqual([`${SITE}/sitemap.xml`, `${SITE}/sitemap-images.xml`]);
  });
});
