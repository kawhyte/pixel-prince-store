import { describe, it, expect } from "vitest";
import { buildAltTextPrompt } from "@/lib/gemini-prompt";

describe("the alt text prompt", () => {
  it("gives the model the facts it cannot see, and only those", () => {
    const prompt = buildAltTextPrompt({
      title: "Brooklyn Neighborhood Map",
      version: "Earth",
      finish: "framed",
      category: "Maps",
    });
    expect(prompt).toContain('"Brooklyn Neighborhood Map"');
    expect(prompt).toContain('"Earth" colorway');
    expect(prompt).toContain("sold framed");
    expect(prompt).toContain("Maps category");
  });

  it("says nothing about a colorway or a frame when there is none", () => {
    const prompt = buildAltTextPrompt({ title: "Sweden Map", finish: "unframed" });
    expect(prompt).not.toContain("colorway");
    expect(prompt).not.toContain("sold unframed");
  });

  it("forbids the things that make alt text useless", () => {
    const prompt = buildAltTextPrompt({ title: "Sweden Map" });
    // honesty, because inventing a scene is both a lie and an SEO penalty
    expect(prompt).toContain("Never invent");
    // length, because screen readers and Google both truncate
    expect(prompt).toContain("125 characters");
    expect(prompt).toContain('Do not start with "Image of"');
    expect(prompt).toContain("No keyword lists");
  });
});
