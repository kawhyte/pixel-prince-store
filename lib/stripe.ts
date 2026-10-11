/**
 * Stripe, for the direct-to-Printful experiment (PLAN-34 phase 2, being trialled 2026-10-11).
 *
 * Fourthwall remains the merchant of record for everything that actually sells. This path exists
 * to answer one question Kenny asked: does owning the checkout feel better than handing off? So it
 * is deliberately inert unless both a key and the provider override are set, and it refuses to run
 * on a live key by accident.
 */
import Stripe from "stripe";

/** Test keys only. A live key here would make Kenny the merchant of record without him deciding to. */
export function stripeKey(): string | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  if (!key.startsWith("sk_test_")) return null;
  return key;
}

let client: Stripe | null = null;

export function getStripe(): Stripe | null {
  const key = stripeKey();
  if (!key) return null;
  if (!client) client = new Stripe(key);
  return client;
}

/** Why the Stripe path is off, in words, so a dead Buy button is never a mystery. */
export function stripeUnavailable(): string | null {
  const raw = process.env.STRIPE_SECRET_KEY?.trim();
  if (!raw) return "STRIPE_SECRET_KEY is not set";
  if (!raw.startsWith("sk_test_")) return "STRIPE_SECRET_KEY is not a test key; this path is test-only on purpose";
  return null;
}
