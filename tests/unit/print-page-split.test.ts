import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// The print page ships only its gallery, price and picker to the browser. These guard the split:
// a "use client" in the sections file, or a static section imported back into the client file,
// would quietly put all of it back in the bundle.
const dir = resolve(process.cwd(), "app/prints/[slug]");
const read = (f: string) => readFileSync(resolve(dir, f), "utf8");

describe("print page server/client split", () => {
  it("renders the static sections on the server", () => {
    expect(read("shop-print-sections.tsx")).not.toMatch(/^\s*["']use client["']/m);
    expect(read("page.tsx")).not.toMatch(/^\s*["']use client["']/m);
  });

  it("keeps the static sections out of the client component", () => {
    const client = read("shop-print-client.tsx");
    for (const name of ["Testimonials", "FaqAccordion", "ArtCard", "EmailSignupForm", "SHOP_SHIPPING_FAQ"]) {
      expect(client).not.toContain(name);
    }
  });
});
