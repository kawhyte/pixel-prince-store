import { test, expect, type Page } from "@playwright/test";

/**
 * PLAN-20 Step 4 — permanent viewport-matrix regression guard.
 * Runs at 390×844 / 768×1024 / 1440×900 via playwright.config projects.
 * Functional only — never asserts performance numbers (dev server).
 */

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  // Allow 1px for sub-pixel rounding.
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
}

const isMobile = (page: Page) => (page.viewportSize()?.width ?? 0) < 768;

test("home: no horizontal overflow + footer present", async ({ page }) => {
  await page.goto("/");
  await expectNoHorizontalOverflow(page);
  await expect(page.getByRole("contentinfo")).toBeVisible();
});

test("free-downloads: no horizontal overflow", async ({ page }) => {
  await page.goto("/free-downloads");
  await expect(
    page.getByRole("heading", { name: /Free printable wall art/i })
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("art detail: no horizontal overflow", async ({ page }) => {
  await page.goto("/free-downloads");
  await page.locator('a[href^="/art/"]').first().click();
  await expect(page).toHaveURL(/\/art\//);
  await expectNoHorizontalOverflow(page);
});

test("nav: mobile menu opens (mobile) / desktop links visible (wide)", async ({ page }) => {
  await page.goto("/");
  if (isMobile(page)) {
    const toggle = page.getByRole("button", { name: /open menu/i });
    await expect(toggle).toBeVisible();
    // Hit-target size guard for the hamburger.
    const box = await toggle.boundingBox();
    expect(box!.width).toBeGreaterThanOrEqual(44);
    expect(box!.height).toBeGreaterThanOrEqual(44);
    await toggle.click();
    await expect(page.getByRole("button", { name: /close menu/i })).toHaveAttribute("aria-expanded", "true");
    await expect(
      page.getByRole("link", { name: "Free Prints" }).last()
    ).toBeVisible();
  } else {
    await expect(
      page.getByRole("navigation").getByRole("link", { name: "Free Prints" })
    ).toBeVisible();
  }
  await expectNoHorizontalOverflow(page);
});

test("art page: download dialog opens and validates email", async ({ page }) => {
  await page.goto("/free-downloads");
  await page.locator('a[href^="/art/"]').first().click();
  await expect(page).toHaveURL(/\/art\//);

  await page.getByRole("button", { name: /Email me this print/i }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  const emailInput = dialog.locator('input[type="email"]');
  await expect(emailInput).toBeVisible();
  // 16px min font-size — the iOS zoom-on-focus guard.
  const fontSize = await emailInput.evaluate(
    (el) => parseFloat(getComputedStyle(el).fontSize)
  );
  expect(fontSize).toBeGreaterThanOrEqual(16);

  // Native email validation blocks a bad address on submit.
  await emailInput.fill("not-an-email");
  const valid = await emailInput.evaluate(
    (el) => (el as HTMLInputElement).checkValidity()
  );
  expect(valid).toBe(false);
});
