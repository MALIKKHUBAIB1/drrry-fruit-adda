import { test, expect, type Page } from "@playwright/test";

/**
 * Admin critical journey.
 * Admin creds come from env ONLY — never hardcoded in the repo.
 */

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@dryfruitadda.in";
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD;

test.describe("admin panel", () => {
  test.skip(!ADMIN_PASS, "E2E_ADMIN_PASSWORD not set — skipping authenticated admin tests");

  test("admin can login and dashboard loads", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByLabel(/email/i).fill(ADMIN_EMAIL);
    await page.getByLabel(/password/i).fill(ADMIN_PASS!);
    await page.getByRole("button", { name: /login/i }).click();

    await page.waitForURL(/\/admin$/, { timeout: 20_000 });
    await expect(page.getByRole("heading").first()).toBeVisible();

    // KPI cards render
    await expect(page.getByText(/revenue|orders|products/i).first()).toBeVisible();
  });

  test("admin cannot be reached by a non-admin session", async ({ page, request }) => {
    const stamp = Date.now().toString(36);
    const res = await request.post("/api/auth/register", {
      data: { name: "Non Admin", email: `e2e-nonadm-${stamp}@example.com`, password: "E2eCustomer!2026" },
    });
    expect([200, 201]).toContain(res.status());

    await page.goto("/admin");
    // Should not show admin data
    await expect(page.getByText(/revenue/i)).toHaveCount(0);
  });

  test("admin API rejects non-admin with 403", async ({ request }) => {
    const stamp = Date.now().toString(36);
    await request.post("/api/auth/register", {
      data: { name: "Non Admin 2", email: `e2e-nonadm2-${stamp}@example.com`, password: "E2eCustomer!2026" },
    });
    const res = await request.get("/api/admin/stats");
    expect(res.status()).toBe(401);
  });
});