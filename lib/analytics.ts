"use client";

function selfExcluded(): boolean {
  try {
    return localStorage.getItem("umami.disabled") === "1";
  } catch {
    return false;
  }
}

function track(name: string, data?: Record<string, string>) {
  if (typeof window === "undefined") return;
  if (selfExcluded()) return;
  window.umami?.track(name, data);
}

export function trackEmailSignup(source: string) {
  track("email_signup", { source });
}
export function trackDownloadClaimed(artId: string) {
  track("download_claimed", { artId });
}
export function trackEtsyClickOut(shop: "main" | "printables", page: string) {
  track("etsy_click_out", { shop, page });
}
export function trackCheckoutOpened(artId: string, sizeId: string, provider: string) {
  track("checkout_opened", { artId, sizeId, provider });
}
export function trackAddToCart(artId: string, sizeId: string) {
  track("add_to_cart", { artId, sizeId });
}
export function trackCartCheckout(items: string) {
  track("cart_checkout", { items });
}

