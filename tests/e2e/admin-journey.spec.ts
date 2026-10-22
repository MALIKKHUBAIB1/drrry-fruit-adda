import { expect, test } from "@playwright/test";

// Creds env se — hardcoded password repo me nahi (admin.spec.ts ke pattern jaisa).
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@dryfruitadda.in";
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD;

test("admin can login to the dashboard and open protected routes", async ({ page }) => {
  test.skip(!ADMIN_PASS, "E2E_ADMIN_PASSWORD not set — skipping");
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible();

  await page.getByLabel("Email").fill(ADMIN_EMAIL);
  // .first() — "Show password" button bhi label se match ho jata hai
  await page.getByLabel("Password").first().fill(ADMIN_PASS!);
  await page.getByRole("button", { name: /login to admin/i }).click();

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByText(/welcome|dashboard|stats/i).first()).toBeVisible();
});
