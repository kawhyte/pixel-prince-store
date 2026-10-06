/**
 * POST /api/revalidate
 *
 * The one Sanity webhook for the site (the free plan allows two):
 * 1. Refreshes every cached page on the next visit, so a publish, unpublish or price sync shows
 *    up at once instead of after each page's revalidate window.
 * 2. When a published artwork is deleted for good, deletes its print file from Cloudinary.
 *
 * Sanity setup (Manage > API > Webhooks):
 * - URL: https://www.thepixelprince.com/api/revalidate
 * - Dataset: production. Trigger on: Create, Update, Delete. Drafts: off
 * - Filter: _type in ["product", "post"]
 * - Projection: see SiteWebhookPayload in lib/sanity-webhook-utils.ts
 * - Secret: SANITY_WEBHOOK_SECRET
 */

import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import {
  orphanedPublicIds,
  parseWebhookBody,
  verifyWebhookSignature,
  type SiteWebhookPayload,
} from "@/lib/sanity-webhook-utils";
import { deleteMultipleCloudinaryAssets } from "@/lib/cloudinary-utils";
import { writeClient } from "@/sanity/lib/write-client";

const LOG = "[REVALIDATE]";

async function draftExists(id: string): Promise<boolean> {
  if (!writeClient) return true; // cannot check: keep the file rather than risk a live print
  const count = await writeClient.fetch<number>(
    "count(*[_id == $draftId])",
    { draftId: `drafts.${id}` },
    { perspective: "raw" }
  );
  return count > 0;
}

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

  let payload: SiteWebhookPayload;
  try {
    payload = parseWebhookBody<SiteWebhookPayload>(rawBody);
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
  console.log(`${LOG} ${payload.operation ?? "change"} ${payload._type} ${payload._id}: site revalidated`);

  let cleaned = 0;
  if (payload.operation === "delete" && payload._type === "product" && payload._id) {
    const ids = orphanedPublicIds(payload, await draftExists(payload._id));
    if (ids.length > 0) {
      const results = await deleteMultipleCloudinaryAssets(ids);
      cleaned = results.filter((r) => r.success).length;
      for (const r of results.filter((x) => !x.success)) {
        console.error(`${LOG} Cloudinary delete failed: ${r.publicId}`, r.error);
      }
      console.log(`${LOG} removed ${cleaned}/${ids.length} Cloudinary file(s) for ${payload._id}`);
    }
  }

  return NextResponse.json({ ok: true, revalidated: true, cleaned });
}
