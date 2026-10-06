/**
 * The one way this codebase calls Gemini (`@google/genai`, which replaced the deprecated
 * `@google/generative-ai`). Server and scripts only: it needs GOOGLE_API_KEY.
 */
import { GoogleGenAI, type Part } from "@google/genai";

export interface GeminiImage {
  /** base64, no data: prefix */
  data: string;
  mimeType: string;
}

export type Gemini = GoogleGenAI;

export function createGemini(apiKey: string): Gemini {
  return new GoogleGenAI({ apiKey });
}

/**
 * One prompt, optionally with one image, to plain text. A blocked or empty answer comes back
 * as "", so callers keep a single "nothing came back" check.
 */
export async function generateText(ai: Gemini, model: string, prompt: string, image?: GeminiImage): Promise<string> {
  const parts: Part[] = [{ text: prompt }];
  if (image) parts.push({ inlineData: image });
  const res = await ai.models.generateContent({ model, contents: [{ role: "user", parts }] });
  return res.text ?? "";
}
