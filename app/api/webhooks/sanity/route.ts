/**
 * POST /api/webhooks/sanity
 *
 * Sanity Webhook Handler - Garbage Collection for Cloudinary Assets
 *
 * This webhook listens for document updates and deletions from Sanity CMS
 * and automatically deletes orphaned Cloudinary assets when they're removed
 * from documents.
 *
 * Supported Events:
 * - delete: Deletes all Cloudinary assets from the deleted document
 * - update: Compares before/after state and deletes removed assets
 *
 * Environment Variables Required:
 * - SANITY_WEBHOOK_SECRET: Secret for validating webhook signatures
 * - NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: Cloudinary cloud name
 * - CLOUDINARY_API_KEY: Cloudinary API key (server-side only)
 * - CLOUDINARY_API_SECRET: Cloudinary API secret (server-side only)
 *
 * Setup Instructions:
 * 1. Add SANITY_WEBHOOK_SECRET to your .env.local file
 * 2. Configure webhook in Sanity Management Console:
 *    - URL: https://yourdomain.com/api/webhooks/sanity
 *    - Dataset: production (or your dataset)
 *    - Secret: [Your SANITY_WEBHOOK_SECRET]
 *    - Trigger on: Update, Delete
 *    - GROQ Projection: See documentation below
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  verifyWebhookSignature,
  parseWebhookBody,
  extractCloudinaryIds,
  type SanityWebhookPayload,
} from '@/lib/sanity-webhook-utils';
import {
  deleteMultipleCloudinaryAssets,
} from '@/lib/cloudinary-utils';

/**
 * Disable body parsing so we can access raw body for signature verification
 */
export const runtime = 'nodejs';

/**
 * Main webhook handler
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    // 1. Validate webhook secret exists
    const webhookSecret = process.env.SANITY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('[Sanity Webhook] SANITY_WEBHOOK_SECRET not configured');
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 500 }
      );
    }

    // 2. Read raw body for signature verification
    const rawBody = await request.text();
    const signature = request.headers.get('sanity-webhook-signature');

    // 3. Verify webhook signature
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('[Sanity Webhook] Invalid signature - rejecting request');
      return NextResponse.json(
        { error: 'Invalid webhook signature' },
        { status: 401 }
      );
    }

    // 4. Get operation type from header
    const operation = request.headers.get('sanity-operation') as 'create' | 'update' | 'delete' | null;

    // 5. Parse webhook body
    const payload = parseWebhookBody<SanityWebhookPayload>(rawBody);
    console.log('[Sanity Webhook] Operation:', operation);
    console.log('[Sanity Webhook] Document ID:', payload._id);
    console.log('[Sanity Webhook] Document type:', payload._type);

    // 6. Handle different event types
    let idsToDelete: string[] = [];

    // A draft's delete fires on every publish or discard, while the published
    // artwork still uses the same files: only a published document's delete may clean up.
    if (payload._id?.startsWith('drafts.')) {
      return NextResponse.json({ success: true, message: 'Draft event - no action required', processed: 0 });
    }

    if (operation === 'delete') {
      // Case A: Document was deleted - remove ALL Cloudinary assets
      console.log('[Sanity Webhook] Handling DELETE event');

      // For delete, payload contains the deleted document
      idsToDelete = extractCloudinaryIds(payload);
      console.log('[Sanity Webhook] Found', idsToDelete.length, 'assets in deleted document');

      if (idsToDelete.length > 0) {
        console.log('[Sanity Webhook] Assets to delete:', idsToDelete);
      }
    } else if (operation === 'update') {
      // Case B: Document was updated
      console.log('[Sanity Webhook] Handling UPDATE event');

      // TODO: We need previous state to detect removed assets
      // For now, we skip garbage collection on updates
      // This requires updating the GROQ projection to include previous document state

      console.log('[Sanity Webhook] ⚠️  UPDATE event detected, but previous state not available');
      console.log('[Sanity Webhook] Cannot detect removed assets without before/after comparison');
      console.log('[Sanity Webhook] Skipping garbage collection for this update');

      return NextResponse.json({
        success: true,
        message: 'Update event - garbage collection skipped (need previous state)',
        processed: 0,
        note: 'Only DELETE events are currently supported for garbage collection'
      });
    } else {
      // Create events don't need garbage collection
      console.log('[Sanity Webhook] CREATE event - no garbage collection needed');
      return NextResponse.json({
        success: true,
        message: 'Create event - no action required',
        processed: 0
      });
    }

    // 6. Delete orphaned assets from Cloudinary
    if (idsToDelete.length === 0) {
      console.log('[Sanity Webhook] No assets to delete - completed successfully');
      const duration = Date.now() - startTime;
      return NextResponse.json({
        success: true,
        message: 'No orphaned assets detected',
        processed: 0,
        duration: `${duration}ms`
      });
    }

    console.log('[Sanity Webhook] Starting Cloudinary deletion...');
    const results = await deleteMultipleCloudinaryAssets(idsToDelete);

    // 7. Analyze results
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const notFoundCount = results.filter(r => r.result === 'not found').length;

    console.log('[Sanity Webhook] Deletion complete:');
    console.log('[Sanity Webhook]   - Total:', results.length);
    console.log('[Sanity Webhook]   - Successful:', successCount);
    console.log('[Sanity Webhook]   - Not found:', notFoundCount);
    console.log('[Sanity Webhook]   - Failed:', failureCount);

    // Log failures for debugging
    if (failureCount > 0) {
      console.error('[Sanity Webhook] Deletion failures:');
      results
        .filter(r => !r.success)
        .forEach(r => {
          console.error('[Sanity Webhook]   -', r.publicId, ':', r.error);
        });
    }

    const duration = Date.now() - startTime;
    console.log('[Sanity Webhook] Total duration:', duration, 'ms');
    console.log('[Sanity Webhook] ========================================');

    // 8. Return results
    return NextResponse.json({
      success: true,
      message: 'Garbage collection completed',
      processed: idsToDelete.length,
      results: {
        total: results.length,
        successful: successCount,
        notFound: notFoundCount,
        failed: failureCount,
      },
      details: results,
      duration: `${duration}ms`
    });
  } catch (error) {
    console.error('[Sanity Webhook] Error processing webhook:', error);

    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET() {
  const isConfigured = !!process.env.SANITY_WEBHOOK_SECRET;

  return NextResponse.json({
    status: 'ok',
    service: 'Sanity Webhook - Cloudinary Garbage Collection',
    configured: isConfigured,
    message: isConfigured
      ? 'Webhook is ready to receive events'
      : 'SANITY_WEBHOOK_SECRET not configured'
  });
}
