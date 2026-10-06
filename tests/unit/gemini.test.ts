import { describe, it, expect, vi, beforeEach } from "vitest";

const generateContent = vi.fn();
vi.mock("@google/genai", () => ({
  GoogleGenAI: class {
    models = { generateContent };
    constructor(public opts: { apiKey: string }) {}
  },
}));

import { createGemini, generateText } from "@/lib/gemini";

describe("generateText", () => {
  beforeEach(() => generateContent.mockReset());

  it("sends the prompt and image as one user turn and returns the text", async () => {
    generateContent.mockResolvedValue({ text: "A colorful Brooklyn map" });
    const out = await generateText(createGemini("k"), "gemini-x", "Describe", { data: "AAA", mimeType: "image/png" });
    expect(out).toBe("A colorful Brooklyn map");
    expect(generateContent).toHaveBeenCalledWith({
      model: "gemini-x",
      contents: [{ role: "user", parts: [{ text: "Describe" }, { inlineData: { data: "AAA", mimeType: "image/png" } }] }],
    });
  });

  it("sends text only when there is no image", async () => {
    generateContent.mockResolvedValue({ text: "ok" });
    await generateText(createGemini("k"), "gemini-x", "Hi");
    expect(generateContent.mock.calls[0][0].contents[0].parts).toEqual([{ text: "Hi" }]);
  });

  it("turns a blocked or empty answer into an empty string", async () => {
    generateContent.mockResolvedValue({ text: undefined });
    expect(await generateText(createGemini("k"), "gemini-x", "Hi")).toBe("");
  });
});
