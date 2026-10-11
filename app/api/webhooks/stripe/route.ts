/**
 * Stripe's ORDER-paid hook, for the direct-to-Printful trial (2026-10-11).
 *
 * How this would really work: Stripe tells us the session was paid, and we create the Printful
 * draft. On a laptop with no `stripe listen` forwarding, nothing reaches here, which is why the
 * success page can do the same job through the same function. Both re-read payment from Stripe.
 */
import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { fulfilStripeSession } from "@/lib/fulfil-stripe-order";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !secret) {
    console.error("[STRIPE-HOOK] not configured");
    return NextResponse.json({ error: "not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "no signature" }, { status: 400 });

  let event;
  try {
    // The raw body is what the signature covers, so it must not be parsed first.
    event = stripe.webhooks.constructEvent(await request.text(), signature, secret);
  } catch (e) {
    console.error("[STRIPE-HOOK] bad signature:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ ignored: event.type });
  }

  const session = event.data.object as { id: string };
  const result = await fulfilStripeSession(session.id);
  console.log(`[STRIPE-HOOK] ${session.id} -> ${result.state}${result.orderId ? ` printful #${result.orderId}` : ""}${result.message ? ` (${result.message})` : ""}`);
  // Always 200 on a signed event we understood: a retry would only repeat a failure we have logged,
  // and the idempotency check means a genuine retry cannot double-order.
  return NextResponse.json(result);
}
