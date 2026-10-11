/**
 * Where Stripe sends a buyer after paying (trial, 2026-10-11).
 *
 * It also fulfils, because on a laptop no webhook is being forwarded and the trial is pointless if
 * the order never reaches Printful. That is safe: `fulfilStripeSession` re-reads payment status
 * from Stripe and refuses anything unpaid, so loading this URL by hand orders nothing.
 */
import Link from "next/link";
import { fulfilStripeSession } from "@/lib/fulfil-stripe-order";

export const dynamic = "force-dynamic";

export default async function CheckoutComplete({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;
  const result = sessionId ? await fulfilStripeSession(sessionId) : null;

  const headline = !sessionId
    ? "No order to show"
    : result?.ok
      ? "Thank you, your print is on its way"
      : "Payment received, but the order needs a look";

  return (
    <main className="mx-auto max-w-xl px-6 py-24">
      <h1 className="text-3xl font-semibold tracking-tight">{headline}</h1>

      {result?.ok && (
        <p className="mt-4 text-sage-300">
          {result.state === "already"
            ? "This order was already placed, so nothing was ordered twice."
            : "We have passed it to the printer."}
        </p>
      )}

      {result && !result.ok && (
        <p className="mt-4 text-sage-300">
          Nothing is lost: the payment went through and the order is recorded. {result.message}
        </p>
      )}

      {/* Trial only: a real receipt would never show the printer's internals. */}
      {result?.orderId && (
        <p className="mt-6 rounded-lg border border-sage-700 bg-sage-900/40 p-4 text-sm text-sage-400">
          Printful draft order #{result.orderId} ({result.state}). Drafts are not charged and not
          printed until confirmed in the dashboard.
        </p>
      )}

      <Link href="/prints" className="mt-10 inline-block underline">
        Back to the prints
      </Link>
    </main>
  );
}
