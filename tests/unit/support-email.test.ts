import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { SUPPORT_EMAIL } from "@/config/support";

function walk(dir: string, out: string[] = []): string[] {
  for (const e of readdirSync(dir)) {
    if (e === "node_modules" || e.startsWith(".")) continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(ts|tsx)$/.test(p)) out.push(p);
  }
  return out;
}

describe("the support address", () => {
  it("is never hardcoded, so one edit changes every page", () => {
    // The footer, privacy and terms each had their own copy of it, and all three kept pointing at
    // an address that hard-bounced after the config was corrected.
    const offenders = walk("app").concat(walk("components")).filter((f) => /hello@thepixelprince\.com/.test(readFileSync(f, "utf8")));
    expect(offenders).toEqual([]);
  });

  it("is an address that actually receives mail", () => {
    // hello@thepixelprince.com returned 554 "user does not exist" on 2026-09-16. Do not put an
    // address here until a test send to it lands.
    expect(SUPPORT_EMAIL).not.toBe("hello@thepixelprince.com");
    expect(SUPPORT_EMAIL).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
  });
});
