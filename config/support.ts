/** Support and order-handling facts used by the shop pages, policy page, terms and privacy (PLAN-39). */

export const SUPPORT_EMAIL = "hello@thepixelprince.com";
export const SUPPORT_RESPONSE = "within 1 business day";
export const DAMAGE_CLAIM_DAYS = 30;

/**
 * Printing plus post, the one place the delivery promise is written down. Every line that quotes it
 * builds off these, and `lib/delivery.ts` turns them into the date a shopper actually reads.
 */
export const DELIVERY_DAYS_MIN = 5;
export const DELIVERY_DAYS_MAX = 11;
export const DELIVERY_WINDOW = `${DELIVERY_DAYS_MIN} to ${DELIVERY_DAYS_MAX} days`;

/** Merchant of record: sends order confirmation and tracking emails, processes payment, calculates tax. */
export const ORDER_PROCESSOR = "Fourthwall";
export const ORDER_PROCESSOR_PRIVACY_URL = "https://fourthwall.com/privacy";
export const ORDER_PROCESSOR_TERMS_URL = "https://fourthwall.com/terms";
