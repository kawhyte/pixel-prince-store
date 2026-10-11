import { createHash } from "crypto";

/**
 * Printful, ordering direct rather than through Fourthwall (trial, 2026-10-11).
 *
 * Orders are created as drafts and never confirmed here. A draft costs nothing, prints nothing and
 * ships nothing: it is the whole point of the trial, which is to see the order arrive correctly
 * without anyone receiving a poster. Confirming is a deliberate, separate act.
 */
const BASE = "https://api.printful.com";

export class PrintfulError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/**
 * An external id Printful will actually accept.
 *
 * The docs cap it at 32 characters of digits, Latin letters, dashes and underscores. A Stripe
 * session id is `cs_test_` plus a long random tail, comfortably past that, so passing it straight
 * through would have been rejected or silently cut - and a cut id breaks the idempotency check
 * that stops a replayed webhook ordering the poster twice. A hash is short, in charset, and still
 * the same every time for the same session.
 */
export function externalId(sessionId: string): string {
  return createHash("sha1").update(sessionId).digest("hex").slice(0, 32);
}

export interface PrintfulRecipient {
  name: string;
  address1: string;
  city: string;
  state_code?: string;
  country_code: string;
  zip: string;
  email?: string;
}

export interface PrintfulItem {
  /** catalog variant id, e.g. 4463 for an 8x10 Enhanced Matte Paper Poster */
  variant_id: number;
  quantity: number;
  /** the artwork to print, as a URL Printful can fetch */
  files: { url: string; type?: string }[];
  name?: string;
  retail_price?: string;
}

export function printfulKey(): string | null {
  return process.env.PRINTFUL_API_KEY?.trim() || null;
}

export function printfulUnavailable(): string | null {
  return printfulKey() ? null : "PRINTFUL_API_KEY is not set";
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const key = printfulKey();
  if (!key) throw new Error("PRINTFUL_API_KEY is not set");
  // An account-level token has to say which store it means; a store-level token already knows.
  const storeId = process.env.PRINTFUL_STORE_ID?.trim();
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(storeId ? { "X-PF-Store-Id": storeId } : {}),
      ...(init?.headers ?? {}),
    },
  });
  const body = await res.text();
  if (!res.ok) throw new PrintfulError(`Printful ${res.status}: ${body.slice(0, 400)}`, res.status);
  return JSON.parse(body).result as T;
}

export interface PrintfulOrder {
  id: number;
  external_id?: string;
  status: string;
  dashboard_url?: string;
}

/**
 * Create the order as a draft.
 *
 * No confirm parameter at all: Printful creates a draft by default and only submits it when asked
 * with `?confirm=1`. Drafts are not charged and are not printed, which is the whole safety of this
 * trial. Confirming is a separate, deliberate act in the dashboard.
 */
export function createDraftOrder(o: {
  externalId: string;
  recipient: PrintfulRecipient;
  items: PrintfulItem[];
}): Promise<PrintfulOrder> {
  return call<PrintfulOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ external_id: o.externalId, recipient: o.recipient, items: o.items }),
  });
}

export function getOrder(id: number | string): Promise<PrintfulOrder> {
  return call<PrintfulOrder>(`/orders/${id}`);
}
