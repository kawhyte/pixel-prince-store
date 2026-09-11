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

  // Clean up so the next run starts empty. However many lines went in: a set adds one per print
  // (PLAN-54), so removing the first and expecting an empty bag was only ever right for a single.
  const remove = drawer.getByRole("button", { name: /Remove/i });
  for (let lines = await remove.count(); lines > 0; lines--) {
    await remove.first().click();
    await expect(remove).toHaveCount(lines - 1);
  }
  await expect(drawer.getByText(/Your cart is empty/i)).toBeVisible();
});
