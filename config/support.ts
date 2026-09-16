/** Support and order-handling facts used by the shop pages, policy page, terms and privacy (PLAN-39). */

/**
 * Where a customer reaches Kenny. It must be an address that actually receives.
 *
 * hello@thepixelprince.com was here and **did not exist**: a test send on 2026-09-16 came back
 * "554 5.7.1 Recipient address rejected: user hello@thepixelprince.com does not exist". Every
 * mailto on the site pointed at a black hole, damage claims included. The Gmail address is the
 * one Fourthwall already forwards to, so it works today with nothing to set up.
 *
 * [KENNY: create hello@ as a forward in Hover when you want the branded address back. Put it here
 * only after a test send to it lands, not before.]
 */
export const SUPPORT_EMAIL = "pixelprince87@gmail.com";
export const SUPPORT_RESPONSE = "within 1 business day";
/**
 * How long a damaged or misprinted print can be reported, counted **from delivery**, not from the
 * order (Kenny, 2026-09-11). With a 5 to 11 business day window those are a fortnight apart, and
 * the difference is only ever noticed during an argument, so every line that quotes this says
 * "of delivery" out loud.
 *
 * 30 matches Fourthwall's own claim window, which is what actually decides the outcome: the
 * production partner covers the replacement and refuses claims past it. Do not raise this number
 * without checking theirs first, or the site promises a reprint we would have to fund ourselves.
 */
export const DAMAGE_CLAIM_DAYS = 30;

/**
 * Printing plus post, the one place the delivery promise is written down. Every line that quotes it
 * builds off these, and `lib/delivery.ts` turns them into the date a shopper actually reads.
 *
 * These are **business days** (Kenny, 2026-09-11): nothing is printed or shipped at a weekend or
 * on a US federal holiday, so counting calendar days promised Sunday arrivals and was out by most
 * of a week over Thanksgiving and Christmas.
 */
export const DELIVERY_DAYS_MIN = 5;
export const DELIVERY_DAYS_MAX = 11;
export const DELIVERY_WINDOW = `${DELIVERY_DAYS_MIN} to ${DELIVERY_DAYS_MAX} business days`;

/** Merchant of record: sends order confirmation and tracking emails, processes payment, calculates tax. */
export const ORDER_PROCESSOR = "Fourthwall";
export const ORDER_PROCESSOR_PRIVACY_URL = "https://fourthwall.com/privacy";
export const ORDER_PROCESSOR_TERMS_URL = "https://fourthwall.com/terms";
