import { test, expect } from "@playwright/test";

/**
 * PLAN-45 cart: needs a published shop print and the cart env vars. Skips cleanly otherwise so
 * CI stays green before launch.
 */
test("add to cart shows the bag count and a checkout link with the cart id", async ({ page }) => {
  await page.goto("/prints");
  const first = page.locator('main a[href^="/prints/"]').first();
  test.skip((await first.count()) === 0, "no published shop print");
  await first.click();
  await expect(page).toHaveURL(/\/prints\//);

  const add = page.getByRole("button", { name: /Add to cart/i }).first();
  test.skip((await add.count()) === 0, "cart not configured (no storefront token or checkout domain)");
  await add.click();

  const drawer = page.getByRole("dialog");
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole("heading", { name: /Your cart/i })).toBeVisible();
  await expect(page.getByTestId("cart-count").first()).toHaveText(/^[1-9]\d*$/);
  const checkout = drawer.getByRole("link", { name: /Checkout/i });
  await expect(checkout).toHaveAttribute("href", /cart\/checkout\?cartId=/);

  // Clean up so the next run starts empty.
  await drawer.getByRole("button", { name: /Remove/i }).first().click();
  await expect(drawer.getByText(/Your cart is empty/i)).toBeVisible();
});
