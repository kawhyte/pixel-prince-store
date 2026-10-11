/**
 * A paid Stripe session becomes a Printful draft order (trial, 2026-10-11).
 *
 * One function, two callers: the webhook, which is how this would really work, and the success
 * page, which is how it can be tried on a laptop with no Stripe CLI forwarding events. Both go
 * through the same checks, and payment is always re-read from Stripe rather than taken on trust
 * from whoever called.
 *
 * The order is created as a draft and never confirmed, so nothing prints and nothing ships.
 */
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createDraftOrder, externalId, getOrder, printfulUnavailable, type PrintfulRecipient } from "@/lib/printful";

export interface FulfilResult {
  ok: boolean;
  /** what happened, for the log and for the page */
  state: "created" | "already" | "unpaid" | "error";
  orderId?: number;
  dashboardUrl?: string;
  message?: string;
}

function recipientFrom(session: Stripe.Checkout.Session): PrintfulRecipient | null {
  const c = session.collected_information?.shipping_details ?? null;
  const a = c?.address;
  if (!a?.line1 || !a.city || !a.country || !a.postal_code) return null;
  return {
    name: c?.name ?? session.customer_details?.name ?? "Customer",
    address1: a.line1,
    city: a.city,
    state_code: a.state ?? undefined,
    country_code: a.country,
    zip: a.postal_code,
    email: session.customer_details?.email ?? undefined,
  };
}

export async function fulfilStripeSession(sessionId: string): Promise<FulfilResult> {
  const stripe = getStripe();
  if (!stripe) return { ok: false, state: "error", message: "Stripe is not configured" };
  const off = printfulUnavailable();
  if (off) return { ok: false, state: "error", message: off };

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  // Never take the caller's word for it. The success page is a URL anyone can type.
  if (session.payment_status !== "paid") {
    return { ok: false, state: "unpaid", message: `payment_status is ${session.payment_status}` };
  }

  // Printful keys orders by external_id, so a replayed webhook finds the first order instead of
  // making a second one. Worth having even in a trial: a duplicate order is the expensive mistake.
  try {
    const existing = await getOrder(`@${externalId(session.id)}`);
    if (existing?.id) {
      return { ok: true, state: "already", orderId: existing.id, dashboardUrl: existing.dashboard_url };
    }
  } catch {
    // not found is the normal path; fall through and create it
  }

  const recipient = recipientFrom(session);
  if (!recipient) return { ok: false, state: "error", message: "the session carries no shipping address" };

  const m = session.metadata ?? {};
  const variantId = Number(m.printfulVariantId);
  if (!Number.isInteger(variantId) || variantId <= 0) {
    return { ok: false, state: "error", message: `metadata has no usable printfulVariantId (${m.printfulVariantId})` };
  }
  if (!m.artUrl) return { ok: false, state: "error", message: "metadata has no artUrl, so there is nothing to print" };

  try {
    const order = await createDraftOrder({
      externalId: externalId(session.id),
      recipient,
      items: [
        {
          variant_id: variantId,
          quantity: 1,
          files: [{ url: m.artUrl, type: "default" }],
          name: [m.printSlug, m.version, m.sizeId, m.finish].filter(Boolean).join(" "),
          retail_price: ((session.amount_total ?? 0) / 100).toFixed(2),
        },
      ],
    });
    return { ok: true, state: "created", orderId: order.id, dashboardUrl: order.dashboard_url };
  } catch (e) {
    return { ok: false, state: "error", message: e instanceof Error ? e.message : String(e) };
  }
}
