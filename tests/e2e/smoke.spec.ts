import { test, expect } from "@playwright/test";

test("home page renders nav and free-downloads link", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "The Pixel Prince", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("navigation").getByRole("link", { name: "All prints" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Free prints" }).first()
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: /Art for your walls/i })
  ).toBeVisible();
  await expect(page.locator('main a[href="/prints"]').first()).toBeVisible(); // hero CTA "Shop all prints"
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.getByText("7,000+ prints shipped").first()).toBeVisible(); // trust strip (footer repeats it)
  // Collection tiles: only collections with art of their own are shown, and no image repeats,
  // so the count moves with the catalogue rather than being fixed at three.
  const tiles = page.locator('main a[href^="/collections/"]');
  const tileCount = await tiles.count();
  expect(tileCount).toBeGreaterThanOrEqual(2);
  expect(tileCount).toBeLessThanOrEqual(3);
  const tileImages = await tiles.locator("img").evaluateAll((els) => els.map((e) => (e as HTMLImageElement).currentSrc));
  expect(new Set(tileImages).size).toBe(tileImages.length);
  await expect(page.getByRole("heading", { name: /What buyers say/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: /A free print every month/i })).toBeVisible();
});

test("free downloads gallery renders and navigates to art detail", async ({ page }) => {
  await page.goto("/free-downloads");
  await expect(
    page.getByRole("heading", { name: /Free printable wall art/i })
  ).toBeVisible();
  const firstCard = page.locator('a[href^="/art/"]').first();
  await firstCard.click();
  await expect(page).toHaveURL(/\/art\//);
  await expect(page.locator("main").getByRole("heading", { level: 1 })).toBeVisible();
});

test("art detail: free CTA appears above the shop cross-sell", async ({ page }) => {
  await page.goto("/free-downloads");
  await page.locator('a[href^="/art/"]').first().click();
  await expect(page).toHaveURL(/\/art\//);
  const cta = page.getByRole("button", { name: /Email me this print/i });
  const shop = page.locator('main a[href="/prints"]').first();
  await expect(cta).toBeVisible();
  await expect(shop).toBeVisible();
  await expect(page.locator('main a[href*="etsy"]')).toHaveCount(0);
  const ctaBox = await cta.boundingBox();
  const shopBox = await shop.boundingBox();
  expect(ctaBox!.y).toBeLessThan(shopBox!.y);
});

test("prints page renders the shop grid or the arriving-soon state", async ({ page }) => {
  await page.goto("/prints");
  await expect(page.locator("main").getByRole("heading", { level: 1, name: "Prints" })).toBeVisible();
  await expect(page.locator('main a[href*="etsy"]')).toHaveCount(0);
  const cards = page.locator('main a[href^="/prints/"]');
  if ((await cards.count()) === 0) {
    await expect(page.getByText(/arriving soon/i)).toBeVisible();
    await expect(page.locator('main input[type="email"]')).toBeVisible();
  } else {
    await expect(page.locator("text=/From \\$\\d+\\.\\d{2}/").first()).toBeVisible();
  }
});

test("collection page renders grid, faq and email form", async ({ page }) => {
  await page.goto("/collections/game-room-wall-art");
  await expect(page.locator("main").getByRole("heading", { level: 1 })).toContainText(/game room/i);
  await expect(page.locator("details").first()).toBeVisible();
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test("basketball hub renders waitlist and faq", async ({ page }) => {
  await page.goto("/collections/basketball-wall-art");
  await expect(page.locator("main").getByRole("heading", { level: 1 })).toContainText(/basketball/i);
  await expect(page.locator('input[type="email"]').first()).toBeVisible();
  await expect(page.locator("details").first()).toBeVisible();
});

test("shipping and returns page renders", async ({ page }) => {
  await page.goto("/shipping-returns");
  await expect(page.locator("main, body").getByRole("heading", { level: 1, name: /Shipping and returns/i })).toBeVisible();
  await expect(page.locator('a[href="mailto:hello@thepixelprince.com"]').first()).toBeVisible();
  await expect(page.locator("details").first()).toBeVisible();
});

