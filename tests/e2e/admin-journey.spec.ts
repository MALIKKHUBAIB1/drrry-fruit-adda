import { expect, test } from "@playwright/test";

test("admin can login to the dashboard and open protected routes", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.getByRole("heading", { name: /admin login/i })).toBeVisible();

  await page.getByLabel("Email").fill("admin@dryfruitadda.in");
  await page.getByLabel("Password").fill("Admin@123");
  await page.getByRole("button", { name: /login to admin/i }).click();

  await expect(page).toHaveURL(/\/admin/);
  await expect(page.getByText(/welcome|dashboard|stats/i)).toBeVisible();
});
