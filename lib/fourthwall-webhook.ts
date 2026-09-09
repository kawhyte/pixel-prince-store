/**
 * Fourthwall order webhook helpers (PLAN-38). Pure: no I/O.
 *
 * Signature (docs /webhooks/signature-verification): header `X-Fourthwall-Hmac-SHA256`
 * = base64(HMAC-SHA256(secret, raw request body)). Compare in constant time.
 *
 * Envelope (docs /webhooks/webhook-model): { testMode, id, webhookId, shopId, type, apiVersion,
 * createdAt, data }. The order `data` shape is read defensively: Fourthwall's published schema
 * is thin, so we look for email, order id, friendly id, totals and variant ids wherever they
 * sit in the object rather than trusting one path.
 */
import { createHmac, timingSafeEqual } from "crypto";

export const FOURTHWALL_SIGNATURE_HEADER = "x-fourthwall-hmac-sha256";

export function verifyFourthwallSignature(rawBody: string, header: string | null, secret: string): boolean {
  if (!header || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
  const a = Buffer.from(expected);
  const b = Buffer.from(header.trim());
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface OrderEvent {
  eventId: string;
  type: string;
  testMode: boolean;
  orderId: string;
  friendlyId?: string;
  email?: string;
  totalCents?: number;
  currency?: string;
  variantIds: string[];
}

type Json = Record<string, unknown>;
const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Depth-first search for variant ids: `variantId` keys, or `variant: { id }` objects. */
function collectVariantIds(node: unknown, out: Set<string>, depth = 0): void {
  if (depth > 8) return;
  if (Array.isArray(node)) {
    for (const item of node) collectVariantIds(item, out, depth + 1);
    return;
  }
  if (!isObj(node)) return;
  if (typeof node.variantId === "string" && UUID.test(node.variantId)) out.add(node.variantId);
  if (isObj(node.variant) && typeof node.variant.id === "string" && UUID.test(node.variant.id)) out.add(node.variant.id);
  for (const [k, v] of Object.entries(node)) {
    if (k === "variant") continue;
    collectVariantIds(v, out, depth + 1);
  }
}

function firstString(obj: Json, keys: string[]): string | undefined {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

function moneyCents(v: unknown): { cents: number; currency?: string } | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return { cents: Math.round(v * 100) };
  if (isObj(v) && typeof v.value === "number" && Number.isFinite(v.value)) {
    return { cents: Math.round(v.value * 100), currency: typeof v.currency === "string" ? v.currency : undefined };
  }
  return undefined;
}

/** Parse a delivery envelope. Returns null when it is not a JSON object with a string `type`. */
export function parseOrderEvent(body: unknown): OrderEvent | null {
  if (!isObj(body) || typeof body.type !== "string") return null;
  const data = isObj(body.data) ? body.data : {};
  const orderId = firstString(data, ["id", "orderId"]) ?? "";
  const friendlyId = firstString(data, ["friendlyId", "orderNumber", "number"]);

  let email = firstString(data, ["email", "customerEmail"]);
  if (!email) {
    for (const key of ["customer", "buyer", "billing", "billingAddress", "shipping", "shippingAddress"]) {
      const sub = data[key];
      if (isObj(sub)) {
        email = firstString(sub, ["email"]);
        if (email) break;
      }
    }
  }

  let totalCents: number | undefined;
  let currency: string | undefined;
  const amounts = isObj(data.amounts) ? data.amounts : data;
  const total = moneyCents(amounts.total ?? amounts.totalPrice ?? amounts.grandTotal);
  if (total) {
    totalCents = total.cents;
    currency = total.currency;
  }
  if (!currency && typeof data.currency === "string") currency = data.currency;

  const ids = new Set<string>();
  collectVariantIds(data, ids);

  return {
    eventId: typeof body.id === "string" ? body.id : "",
    type: body.type,
    testMode: body.testMode === true,
    orderId,
    friendlyId,
    email: email?.toLowerCase(),
    totalCents,
    currency,
    variantIds: Array.from(ids),
  };
}

/** Deterministic Sanity id for an order, so retries update instead of duplicating. */
export function sanityIdForOrder(orderId: string): string {
  return `fworder-${orderId.replace(/[^A-Za-z0-9_.-]/g, "_")}`;
}
