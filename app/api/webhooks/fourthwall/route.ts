/**
 * POST /api/webhooks/fourthwall (PLAN-38)
 *
 * Fourthwall order webhook. On ORDER_PLACED:
 *   1. verify the base64 HMAC-SHA256 signature over the raw body (FOURTHWALL_WEBHOOK_SECRET)
 *   2. record the order once (fwOrder document, deterministic id, so retries are no-ops)
 *   3. increment `sales` on every artwork whose Fourthwall variant ids appear in the order
 *   4. add the buyer to the Resend audience (best effort, never blocks the 200)
 *
 * Test deliveries (testMode: true, from the dashboard's "Send test notification") are
 * acknowledged and logged but write nothing.
 *
 * Setup: Fourthwall admin > Settings > For Developers > Webhooks > add
 * https://www.thepixelprince.com/api/webhooks/fourthwall, subscribe to ORDER_PLACED,
 * copy the secret into FOURTHWALL_WEBHOOK_SECRET.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  FOURTHWALL_SIGNATURE_HEADER,
  parseOrderEvent,
  sanityIdForOrder,
  verifyFourthwallSignature,
} from "@/lib/fourthwall-webhook";
import { writeClient } from "@/sanity/lib/write-client";
import { emailProvider } from "@/lib/email";

export const runtime = "nodejs";

const LOG = "[FW-WEBHOOK]";

export async function POST(request: NextRequest) {
  const secret = process.env.FOURTHWALL_WEBHOOK_SECRET;
  if (!secret) {
    console.error(`${LOG} FOURTHWALL_WEBHOOK_SECRET not configured`);
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  if (!verifyFourthwallSignature(rawBody, request.headers.get(FOURTHWALL_SIGNATURE_HEADER), secret)) {
    console.warn(`${LOG} invalid signature`);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const event = parseOrderEvent(body);
  if (!event) return NextResponse.json({ error: "Not a webhook envelope" }, { status: 400 });

  if (event.type !== "ORDER_PLACED") {
    console.log(`${LOG} ignored ${event.type}`);
    return NextResponse.json({ ok: true, ignored: event.type });
  }
  if (event.testMode) {
    console.log(`${LOG} test delivery ok (${event.eventId}), nothing written`);
    return NextResponse.json({ ok: true, test: true });
  }
  if (!event.orderId) {
    console.warn(`${LOG} ORDER_PLACED without an order id`);
    return NextResponse.json({ error: "Missing order id" }, { status: 400 });
  }
  if (!writeClient) {
    console.error(`${LOG} Sanity write client not configured`);
    return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
  }

  const orderDocId = sanityIdForOrder(event.orderId);
  const existing = await writeClient.getDocument(orderDocId);
  if (existing) {
    console.log(`${LOG} duplicate delivery for ${event.orderId}, already recorded`);
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Artworks whose Fourthwall offer carries one of the ordered variant ids.
  const artworkIds: string[] =
    event.variantIds.length > 0
      ? await writeClient.fetch<string[]>(
          `*[_type == "product" && count(offers[provider == "fourthwall"].sizes[providerVariantId in $ids]) > 0]._id`,
          { ids: event.variantIds }
        )
      : [];

  let tx = writeClient.transaction().createIfNotExists({
    _id: orderDocId,
    _type: "fwOrder",
    orderId: event.orderId,
    friendlyId: event.friendlyId,
    email: event.email,
    totalCents: event.totalCents,
    currency: event.currency,
    variantIds: event.variantIds,
    artworks: artworkIds.map((id) => ({ _type: "reference", _ref: id, _key: id })),
    receivedAt: new Date().toISOString(),
  });
  for (const id of artworkIds) {
    tx = tx.patch(id, (p) => p.setIfMissing({ sales: 0 }).inc({ sales: 1 }));
  }
  await tx.commit();
  console.log(`${LOG} recorded ${event.orderId} (${event.friendlyId ?? "no number"}): ${artworkIds.length} artwork(s)`);

  if (event.email) {
    emailProvider
      .addToAudience(event.email)
      .catch((e) => console.error(`${LOG} audience add failed`, e));
  }

  return NextResponse.json({ ok: true, artworks: artworkIds.length });
}
