"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { CART_STORAGE_KEY } from "@/config/commerce";
import {
  addToCart,
  cartEnabled,
  changeQuantity,
  createCart,
  getCart,
  removeFromCart,
  type Cart,
  type CartLine,
} from "@/lib/fourthwall-cart";

interface CartContextValue {
  enabled: boolean;
  cart: Cart | null;
  busy: boolean;
  open: boolean;
  setOpen: (open: boolean) => void;
  /** one line, or several at once for a set (PLAN-54): they must land in the bag together */
  add: (line: CartLine | CartLine[]) => Promise<Cart | null>;
  setQuantity: (variantId: string, quantity: number) => Promise<void>;
  remove: (variantId: string) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

function readStoredId(): string | null {
  try {
    return window.localStorage.getItem(CART_STORAGE_KEY);
  } catch {
    return null;
  }
}

function storeId(id: string | null) {
  try {
    if (id) window.localStorage.setItem(CART_STORAGE_KEY, id);
    else window.localStorage.removeItem(CART_STORAGE_KEY);
  } catch {
    // storage unavailable (private mode): the cart just will not persist
  }
}

/**
 * Cart state for the whole site (PLAN-45). Fourthwall owns the cart; we keep its id in
 * localStorage and mirror the latest cart object for the bag count and the drawer.
 */
export function CartProvider({ children }: { children: React.ReactNode }) {
  const enabled = cartEnabled();
  const [cart, setCart] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const loaded = useRef(false);

  // Restore a stored cart after mount; a dead id is dropped silently.
  useEffect(() => {
    if (!enabled || loaded.current) return;
    loaded.current = true;
    const id = readStoredId();
    if (!id) return;
    getCart(id)
      .then((c) => setCart(c))
      .catch(() => {
        storeId(null);
      });
  }, [enabled]);

  const apply = useCallback((c: Cart) => {
    setCart(c);
    storeId(c.id);
  }, []);

  const add = useCallback(
    async (line: CartLine | CartLine[]) => {
      if (!enabled) return null;
      // A set adds every print in one call, so the bag never shows half of it, and one failure
      // cannot leave a buyer holding one poster of a pair.
      const lines = Array.isArray(line) ? line : [line];
      if (lines.length === 0) return null;
      setBusy(true);
      try {
        let next: Cart;
        if (cart?.id) {
          try {
            next = await addToCart(cart.id, lines);
          } catch {
            next = await createCart(lines); // stale cart id: start over
          }
        } else {
          next = await createCart(lines);
        }
        apply(next);
        return next;
      } finally {
        setBusy(false);
      }
    },
    [apply, cart?.id, enabled],
  );

  const setQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      if (!cart?.id) return;
      setBusy(true);
      try {
        const next =
          quantity <= 0
            ? await removeFromCart(cart.id, [{ variantId, quantity: 99 }])
            : await changeQuantity(cart.id, [{ variantId, quantity }]);
        apply(next);
      } finally {
        setBusy(false);
      }
    },
    [apply, cart?.id],
  );

  const remove = useCallback((variantId: string) => setQuantity(variantId, 0), [setQuantity]);

  const value = useMemo(
    () => ({ enabled, cart, busy, open, setOpen, add, setQuantity, remove }),
    [enabled, cart, busy, open, add, setQuantity, remove],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used inside CartProvider");
  }
  return ctx;
}
