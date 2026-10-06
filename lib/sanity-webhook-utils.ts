/**
 * Sanity Webhook Utilities
 * Functions for parsing, validating, and processing Sanity webhooks
 */

import crypto from 'crypto';

/** How old a signed delivery may be before it is treated as a replay. */
export const SIGNATURE_TOLERANCE_MS = 5 * 60 * 1000;

/**
 * Verify Sanity webhook signature using HMAC-SHA256
 *
 * @param body - Raw request body (string or Buffer)
 * @param signature - Value from 'sanity-webhook-signature' header
 * @param secret - Your SANITY_WEBHOOK_SECRET environment variable
 * @param now - current time in ms (for tests)
 * @returns true if signature is valid and recent, false otherwise
 *
 * @see https://www.sanity.io/docs/webhooks#signing-and-validating-requests
 */
export function verifyWebhookSignature(
  body: string | Buffer,
  signature: string | null | undefined,
  secret: string,
  now: number = Date.now()
): boolean {
  if (!signature) {
    console.error('[Sanity Webhook] Missing signature header');
    return false;
  }

  try {
    // Parse signature header format: "t={timestamp},v1={signature}"
    const parts = signature.split(',').reduce((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) {
        acc[key.trim()] = value.trim();
      }
      return acc;
    }, {} as Record<string, string>);

    const receivedSignature = parts.v1;
    const timestamp = parts.t;

    if (!receivedSignature || !timestamp) {
      console.error('[Sanity Webhook] Invalid signature format');
      return false;
    }

    // Sanity sends milliseconds; accept seconds too.
    const t = Number(timestamp);
    const sentAt = t < 1e12 ? t * 1000 : t;
    if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > SIGNATURE_TOLERANCE_MS) {
      console.error('[Sanity Webhook] Signature timestamp outside tolerance');
      return false;
    }

    // Compute expected signature: HMAC-SHA256(timestamp.body, secret)
    const payload = `${timestamp}.${typeof body === 'string' ? body : body.toString('utf8')}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('base64')
      // Convert to URL-safe base64 (base64url)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, ''); // Remove padding

    const received = Buffer.from(receivedSignature);
    const expected = Buffer.from(expectedSignature);
    if (received.length !== expected.length) return false;
    // Constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(received, expected);
  } catch (error) {
    console.error('[Sanity Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * Parse and validate Sanity webhook request body
 *
 * @param rawBody - Raw request body string
 * @returns Parsed webhook payload
 * @throws Error if body is invalid JSON
 */
export function parseWebhookBody<T = unknown>(rawBody: string): T {
  try {
    return JSON.parse(rawBody) as T;
  } catch (error) {
    throw new Error(`Failed to parse webhook body: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sanity webhook event types
 */
export type SanityWebhookEvent = 'create' | 'update' | 'delete';

/**
 * What the site webhook (/api/revalidate) receives. Paste this projection into the Sanity webhook:
 *
 *   {_id, _type, "operation": delta::operation(),
 *    "deletedPublicIds": select(delta::operation() == "delete" => [before().artFile.cloudinaryPublicId], [])}
 *
 * The operation travels in the signed body, not the unsigned `sanity-operation` header.
 */
export interface SiteWebhookPayload {
  _id?: string;
  _type?: string;
  operation?: SanityWebhookEvent;
  deletedPublicIds?: (string | null)[];
}

/**
 * The Cloudinary files a delivery leaves with no owner. Only a published artwork's delete
 * counts, and not when a draft of it survives: unpublishing deletes the published document
 * while the draft still points at the same print file.
 */
export function orphanedPublicIds(payload: SiteWebhookPayload, draftSurvives: boolean): string[] {
  if (payload.operation !== 'delete' || payload._type !== 'product') return [];
  if (!payload._id || payload._id.includes('.') || draftSurvives) return [];
  return Array.from(
    new Set((payload.deletedPublicIds ?? []).filter((id): id is string => typeof id === 'string' && id.length > 0))
  );
}
