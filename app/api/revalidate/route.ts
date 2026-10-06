/**
 * POST /api/revalidate
 *
 * Sanity publish webhook: refreshes every cached page on the next visit, so a publish,
 * unpublish or price sync shows up at once instead of after each page's revalidate window.
 *
 * Sanity setup (Manage > API > Webhooks):
 * - URL: https://www.thepixelprince.com/api/revalidate
 * - Trigger on: Create, Update, Delete. Filter: _type in ["product", "post"]
 * - Drafts: off. Projection: {_id, _type}
 * - Secret: SANITY_WEBHOOK_SECRET
 */

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { parseWebhookBody, verifyWebhookSignature, type SanityWebhookPayload } from "@/lib/sanity-webhook-utils";

const LOG = "[REVALIDATE]";

export async function POST(request: NextRequest) {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    console.error(`${LOG} SANITY_WEBHOOK_SECRET not configured`);
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!verifyWebhookSignature(rawBody, request.headers.get("sanity-webhook-signature"), secret)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: SanityWebhookPayload;
  try {
    payload = parseWebhookBody<SanityWebhookPayload>(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  // A draft never reaches a visitor, so it changes nothing that is cached.
  if (payload._id?.startsWith("drafts.")) {
    return NextResponse.json({ ok: true, skipped: "draft" });
  }

  // The catalogue feeds the homepage, grids, collections, sitemaps and every print page, so a
  // single artwork touches most of the site: refresh it all rather than guess which pages.
  revalidatePath("/", "layout");
  console.log(`${LOG} ${payload._type} ${payload._id}: site revalidated`);
  return NextResponse.json({ ok: true, revalidated: true });
}
