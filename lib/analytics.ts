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
/** What the buyer chose, as separate fields so Umami can break add-to-cart down by each. */
export interface PrintChoice {
  finish?: string | null;
  version?: string | null;
  size?: string | null;
}

function choiceData(choice: PrintChoice): Record<string, string> {
  const out: Record<string, string> = {};
  if (choice.finish) out.finish = choice.finish;
  if (choice.version) out.version = choice.version;
  if (choice.size) out.size = choice.size;
  return out;
}

export function trackAddToCart(artId: string, choice: PrintChoice) {
  track("add_to_cart", { artId, ...choiceData(choice) });
}
/** A finish, version or size picked on a print page: the step between viewing and adding to cart. */
export function trackOptionPicked(artId: string, option: "finish" | "version" | "size", value: string) {
  track("option_picked", { artId, option, value });
}
export function trackCartCheckout(items: string) {
  track("cart_checkout", { items });
}
/** A "Pairs well with" print opened from the cart. */
export function trackCartSuggestion(slug: string) {
  track("cart_suggestion_clicked", { slug });
}
/** Lines dropped from a saved bag because they can no longer be bought. */
export function trackCartUnavailableRemoved(count: number) {
  track("cart_unavailable_removed", { count: String(count) });
}
