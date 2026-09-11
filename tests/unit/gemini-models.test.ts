import { describe, it, expect } from "vitest";
import { GEMINI_ALT_TEXT_MODEL, GEMINI_DESCRIPTION_MODEL } from "@/config/gemini";

describe("gemini model ids", () => {
  it("never points at a model Google has retired", () => {
    // Checked 2026-09-11: this one answers 404 "no longer available to new users". A dead id is a
    // button that stops working for a reason you cannot see in the code.
    const retired = ["gemini-2.5-flash-lite", "gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro-vision"];
    for (const model of [GEMINI_ALT_TEXT_MODEL, GEMINI_DESCRIPTION_MODEL]) {
      expect(retired).not.toContain(model);
      expect(model).toMatch(/^gemini-[\d.]+-(flash|pro)(-lite)?$/);
    }
  });

  it("keeps alt text on a lite model, because that button is clicked and waited on", () => {
    expect(GEMINI_ALT_TEXT_MODEL).toMatch(/-lite$/);
  });
});
