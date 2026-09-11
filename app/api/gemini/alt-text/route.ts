import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/admin-auth";
import { buildAltTextPrompt } from "@/lib/gemini-prompt";

interface AltTextRequest {
  imageUrl?: string;
  title?: string;
  version?: string;
  finish?: string;
  category?: string;
}

const ALLOWED_HOSTS = ["cdn.sanity.io", "res.cloudinary.com"];
const MAX_ALT_LENGTH = 160;

/** Studio only: looks at an image and writes alt text for it (PLAN-53). */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = requireAdminSecret(request);
  if (authError) return authError;

  let body: AltTextRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }

  const { imageUrl, title } = body;
  if (!imageUrl || !title) {
    return NextResponse.json({ error: "An image and a title are required" }, { status: 400 });
  }

  let host: string;
  try {
    host = new URL(imageUrl).hostname;
  } catch {
    return NextResponse.json({ error: "That image URL is not valid" }, { status: 400 });
  }
  if (!ALLOWED_HOSTS.includes(host)) {
    return NextResponse.json({ error: "Image URL host not allowed" }, { status: 400 });
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Google API key not configured" }, { status: 503 });
  }

  try {
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({ error: `Could not fetch the image (${imageResponse.status})` }, { status: 400 });
    }
    const base64 = Buffer.from(await imageResponse.arrayBuffer()).toString("base64");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent([
      buildAltTextPrompt({ title, version: body.version, finish: body.finish, category: body.category }),
      { inlineData: { data: base64, mimeType: imageResponse.headers.get("content-type") || "image/jpeg" } },
    ]);

    // The model is asked for a bare sentence, but tidy it anyway rather than trust it.
    const alt = (await result.response)
      .text()
      .replace(/^["'\s]+|["'\s.]+$/g, "")
      .replace(/\s+/g, " ")
      .slice(0, MAX_ALT_LENGTH);

    if (!alt) return NextResponse.json({ error: "Gemini returned nothing" }, { status: 502 });
    return NextResponse.json({ alt });
  } catch (error) {
    console.error("[ALT-TEXT]", error);
    const raw = error instanceof Error ? error.message : "Unknown error";
    // Gemini's own messages are long and start with an HTTP code. Name the two that actually
    // happen, because "try again" and "this image will never work" need different reactions.
    const details = /\b429\b|quota|rate/i.test(raw)
      ? "Gemini is rate limiting. Wait a minute and try again."
      : /safety|blocked/i.test(raw)
        ? "Gemini refused to describe this image."
        : /\b(500|502|503|504)\b|overload|unavailable/i.test(raw)
          ? "Gemini is busy. Try again in a moment."
          : raw;
    return NextResponse.json({ error: "Could not write alt text", details }, { status: 500 });
  }
}
