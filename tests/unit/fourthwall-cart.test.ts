import { describe, it, expect, vi, afterEach } from "vitest";
import {
  cartTotalCents,
  cartCount,
  buildCartCheckoutUrl,
  cartEnabled,
  createCart,
  addToCart,
  CartError,
  type Cart,
} from "@/lib/fourthwall-cart";

const cart: Cart = {
  id: "c1",
  items: [
    { quantity: 2, variant: { id: "v1", unitPrice: { value: 23.0, currency: "USD" } } },
    { quantity: 1, variant: { id: "v2", unitPrice: { value: 39.99, currency: "USD" } } },
    { quantity: 1, variant: { id: "v3" } },
  ],
};

describe("cart helpers", () => {
  it("sums cents and counts prints", () => {
    expect(cartTotalCents(cart)).toBe(2300 * 2 + 3999);
    expect(cartCount(cart)).toBe(4);
    expect(cartTotalCents(null)).toBe(0);
    expect(cartCount(null)).toBe(0);
  });
  it("builds the cart checkout url with attribution", () => {
    const u = new URL(buildCartCheckoutUrl("c1", "cart", "checkout.example.com")!);
    expect(u.pathname).toBe("/cart/checkout");
    expect(u.searchParams.get("cartId")).toBe("c1");
    expect(u.searchParams.get("currency")).toBe("USD");
    expect(u.searchParams.get("utm_campaign")).toBe("cart");
    expect(buildCartCheckoutUrl("c1", "cart", "")).toBeNull();
  });
  it("is enabled only with both env values", () => {
    expect(cartEnabled("ptkn_x", "shop.example.com")).toBe(true);
    expect(cartEnabled("", "shop.example.com")).toBe(false);
    expect(cartEnabled("ptkn_x", "")).toBe(false);
  });
});

describe("cart api client", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("posts items to create and add, with the token on the query string", async () => {
    const calls: { url: string; body: unknown }[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
        return new Response(JSON.stringify({ id: "c9", items: [] }), { status: 200 });
      }),
    );
    const created = await createCart([{ variantId: "v1", quantity: 1 }], "ptkn_t");
    expect(created.id).toBe("c9");
    await addToCart("c9", [{ variantId: "v2", quantity: 3 }], "ptkn_t");
    expect(calls[0].url).toBe("https://storefront-api.fourthwall.com/v1/carts?storefront_token=ptkn_t");
    expect(calls[0].body).toEqual({ items: [{ variantId: "v1", quantity: 1 }] });
    expect(calls[1].url).toBe("https://storefront-api.fourthwall.com/v1/carts/c9/add?storefront_token=ptkn_t");
    expect(calls[1].body).toEqual({ items: [{ variantId: "v2", quantity: 3 }] });
  });

  it("throws a CartError with the status on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 404 })));
    await expect(createCart([{ variantId: "v1", quantity: 1 }], "ptkn_t")).rejects.toMatchObject({ status: 404 });
    await expect(createCart([{ variantId: "v1", quantity: 1 }], "ptkn_t")).rejects.toBeInstanceOf(CartError);
  });
});
