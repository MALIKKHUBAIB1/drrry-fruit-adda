import { expect, test } from "@playwright/test";

test("customer can browse products, login, and reach checkout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /nature's finest/i })).toBeVisible();

  await page.goto("/shop");
  await expect(page).toHaveURL(/\/shop/);

  await expect(page.getByRole("heading", { name: /shop all|results for/i })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: /premium california almonds/i })).toBeVisible({ timeout: 30_000 });

  const addButton = page.getByRole("button", { name: /^add to cart$/i }).first();
  await expect(addButton).toBeVisible({ timeout: 30_000 });
  await addButton.click();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: /cart/i })).toBeVisible();

  await page.goto("/login?redirect=/checkout");
  await expect(page).toHaveURL(/\/login/);

  await page.getByLabel("Email").fill("priya@example.com");
  await page.getByLabel("Password").fill("Demo@123");
  await page.getByRole("button", { name: /login/i }).click();

  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible();

  await page.getByLabel("Full name").fill("Priya Sharma");
  await page.getByLabel("Phone").fill("9876543210");
  await page.getByLabel("Email").fill("priya@example.com");
  await page.getByLabel("Address").fill("12 Market Road, Bengaluru");
  await page.getByLabel("City").fill("Bengaluru");
  await page.getByLabel("State").fill("Karnataka");
  await page.getByLabel("PIN code").fill("560001");
  await page.getByRole("button", { name: /place order/i }).click();

  await expect(page.getByText(/order placed|thank you/i)).toBeVisible();
});
