/**
 * Fourthwall Storefront cart client (PLAN-45). Browser-safe: the public storefront token can
 * read products and edit carts only. Verified 2026-09-08 against the live API: create needs
 * at least one item, CORS is open, checkout accepts `cartId`.
 */
import { CHECKOUT_UTM, CURRENCY, FOURTHWALL_CHECKOUT_DOMAIN, FOURTHWALL_STOREFRONT_TOKEN_PUBLIC } from "@/config/commerce";

const BASE = "https://storefront-api.fourthwall.com/v1";

export interface CartVariant {
  id: string;
  name?: string;
  unitPrice?: { value?: number; currency?: string };
  attributes?: { size?: { name?: string } };
  images?: { url: string }[];
  product?: { id?: string; name?: string; slug?: string };
}

export interface CartItem {
  quantity: number;
  variant: CartVariant;
}

export interface Cart {
  id: string;
  items: CartItem[];
}

export interface CartLine {
  variantId: string;
  quantity: number;
}

export class CartError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

/** True when both env values needed for the on-site cart are present. */
export function cartEnabled(
  token: string = FOURTHWALL_STOREFRONT_TOKEN_PUBLIC,
  domain: string = FOURTHWALL_CHECKOUT_DOMAIN,
): boolean {
  return Boolean(token && domain);
}

async function call<T>(path: string, init?: RequestInit, token: string = FOURTHWALL_STOREFRONT_TOKEN_PUBLIC): Promise<T> {
  const url = `${BASE}${path}${path.includes("?") ? "&" : "?"}storefront_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new CartError(`Fourthwall cart ${res.status}`, res.status);
  return (await res.json()) as T;
}

export function createCart(items: CartLine[], token?: string): Promise<Cart> {
  return call<Cart>("/carts", { method: "POST", body: JSON.stringify({ items }) }, token);
}

export function getCart(id: string, token?: string): Promise<Cart> {
  return call<Cart>(`/carts/${encodeURIComponent(id)}`, undefined, token);
}

export function addToCart(id: string, items: CartLine[], token?: string): Promise<Cart> {
  return call<Cart>(`/carts/${encodeURIComponent(id)}/add`, { method: "POST", body: JSON.stringify({ items }) }, token);
}

/** Absolute quantity per variant. */
export function changeQuantity(id: string, items: CartLine[], token?: string): Promise<Cart> {
  return call<Cart>(`/carts/${encodeURIComponent(id)}/change`, { method: "POST", body: JSON.stringify({ items }) }, token);
}

/** Quantity to remove per variant. */
export function removeFromCart(id: string, items: CartLine[], token?: string): Promise<Cart> {
  return call<Cart>(`/carts/${encodeURIComponent(id)}/remove`, { method: "POST", body: JSON.stringify({ items }) }, token);
}

/** Pure: sum of unitPrice × quantity, in cents. Fourthwall returns no cart-level totals. */
export function cartTotalCents(cart: Cart | null): number {
  if (!cart) return 0;
  return cart.items.reduce((sum, item) => {
    const v = item.variant.unitPrice?.value;
    return sum + (typeof v === "number" ? Math.round(v * 100) * item.quantity : 0);
  }, 0);
}

/** Pure: number of prints in the cart. */
export function cartCount(cart: Cart | null): number {
  return cart ? cart.items.reduce((n, item) => n + item.quantity, 0) : 0;
}

/** Checkout for a whole cart on the checkout domain, with attribution. */
export function buildCartCheckoutUrl(cartId: string, campaign: string, domain: string = FOURTHWALL_CHECKOUT_DOMAIN): string | null {
  if (!domain || !cartId) return null;
  const url = new URL(`https://${domain}/cart/checkout`);
  url.searchParams.set("cartId", cartId);
  url.searchParams.set("currency", CURRENCY);
  url.searchParams.set("utm_source", CHECKOUT_UTM.utm_source);
  url.searchParams.set("utm_medium", CHECKOUT_UTM.utm_medium);
  url.searchParams.set("utm_campaign", campaign);
  return url.toString();
}
