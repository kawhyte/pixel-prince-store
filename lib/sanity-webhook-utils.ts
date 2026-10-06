/**
 * Sanity Webhook Utilities
 * Functions for parsing, validating, and processing Sanity webhooks
 */

import crypto from 'crypto';

/**
 * Recursively extract all cloudinaryPublicId values from a Sanity document
 *
 * @param doc - Any Sanity document or object
 * @returns Array of unique cloudinaryPublicId strings
 *
 * @example
 * const ids = extractCloudinaryIds(product);
 * // Returns: ["high-res-assets/moon-8x10", "high-res-assets/moon-16x20"]
 */
export function extractCloudinaryIds(doc: unknown): string[] {
  const ids: string[] = [];

  function traverse(value: unknown): void {
    if (value === null || value === undefined) {
      return;
    }

    // Handle arrays
    if (Array.isArray(value)) {
      value.forEach(item => traverse(item));
      return;
    }

    // Handle objects
    if (typeof value === 'object') {
      const obj = value as Record<string, unknown>;

      // Check if this object has cloudinaryPublicId
      if ('cloudinaryPublicId' in obj && typeof obj.cloudinaryPublicId === 'string') {
        ids.push(obj.cloudinaryPublicId);
      }

      // Recursively traverse all object properties
      Object.values(obj).forEach(v => traverse(v));
    }
  }

  traverse(doc);

  // Return unique IDs only
  return Array.from(new Set(ids));
}

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
 * Calculate the difference between two arrays of Cloudinary public IDs
 * Returns IDs that exist in 'before' but not in 'after' (i.e., deleted assets)
 *
 * @param before - IDs from previous document state
 * @param after - IDs from current document state
 * @returns IDs to delete
 */
export function calculateDeletedIds(before: string[], after: string[]): string[] {
  return before.filter(id => !after.includes(id));
}

/**
 * Sanity webhook event types
 */
export type SanityWebhookEvent = 'create' | 'update' | 'delete';

/**
 * Sanity webhook payload structure
 */
export interface SanityWebhookPayload {
  _id: string;
  _type: string;
  _rev?: string;
  _createdAt?: string;
  _updatedAt?: string;
  [key: string]: unknown;
}

/**
 * Sanity webhook request structure
 */
export interface SanityWebhookRequest {
  ids: {
    created: string[];
    deleted: string[];
    updated: string[];
  };
}

/**
 * Determine webhook event type from request payload
 *
 * @param payload - Webhook request payload
 * @returns Event type: 'create', 'update', or 'delete'
 */
export function getEventType(payload: SanityWebhookRequest): SanityWebhookEvent | null {
  if (payload.ids.deleted.length > 0) {
    return 'delete';
  }
  if (payload.ids.updated.length > 0) {
    return 'update';
  }
  if (payload.ids.created.length > 0) {
    return 'create';
  }
  return null;
}
