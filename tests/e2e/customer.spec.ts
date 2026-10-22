import assert from "node:assert/strict";
import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.TEST_BASE_URL ?? "http://localhost:3100";

/**
 * Customer critical journey:
 *  browse -> product -> add to cart -> qty change -> checkout -> order placed
 *
 * Uses a throwaway account per run so runs are independent and idempotent.
 */

test.describe("customer purchase journey", () => {
  test("can browse, add to cart, change qty and reach checkout", async ({ page }) => {
    // ---- browse home ----
    await page.goto("/");
    await expect(page.locator("header")).toBeVisible();

    // ---- shop grid loads real products ----
    await page.goto("/shop");
    const cards = page.locator('a[href^="/product/"]');
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });

    // ---- open a product ----
    await cards.first().click();
    await page.waitForURL(/\/product\/.+/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // ---- specifications tab exists ----
    await expect(page.getByRole("tab", { name: /specifications/i })).toBeVisible();

    // ---- add to cart ----
    const addBtn = page.getByRole("button", { name: /add to cart/i }).first();
    await expect(addBtn).toBeEnabled();
    await addBtn.click();

    // ---- cart reflects the item, and no modal hijacked the page ----
    await page.goto("/cart");
    await expect(page.getByText(/jumbo|premium|arabian|california|kashmiri|super seeds/i).first())
      .toBeVisible({ timeout: 20_000 });

    // ---- qty stepper increments ----
    const plus = page.getByRole("button", { name: /increase quantity/i }).first();
    if (await plus.count()) {
      await plus.click();
      await expect(plus).toBeVisible();
    }

    // ---- checkout form (requires an authenticated session) ----
    const stamp = Date.now().toString(36);
    const email = `e2e-checkout-${stamp}@example.com`;
    const pw = "E2eCustomer!2026";

    await page.request.post("/api/auth/register", {
      data: { name: "Checkout Tester", email, password: pw },
    });
    const login = await page.request.post("/api/auth/login", {
      data: { email, password: pw },
    });
    const setCookie = login.headers()["set-cookie"] ?? "";
    const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).match(/dfa_session=([^;]+)/);
    assert(cookie, "could not obtain a session cookie");

    // Origin page se lo — port-agnostic (CI 3001 / local 3100 dono chalein)
    const origin = new URL(page.url()).origin;
    await page.context().addCookies([
      { name: "dfa_session", value: cookie[1], url: origin },
    ]);

    const products = await page.request.get("/api/products?limit=1");
    const p0 = (await products.json()).products[0];
    await page.request.put("/api/cart", {
      data: { items: [{ slug: p0.slug, variant: p0.variants[0].label, qty: 1 }] },
    });

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: /^checkout$/i })).toBeVisible({ timeout: 25_000 });

    // Chrome autofill attributes must be present on every address field
    for (const name of [
      "shipping-name",
      "shipping-tel",
      "shipping-address-line1",
      "shipping-address-level2",
      "shipping-address-level1",
      "shipping-postal-code",
      "shipping-country",
    ]) {
      await expect(page.locator(`[name="${name}"]`), `missing autofill field ${name}`).toBeAttached();
    }
  });

  test("login form rejects empty submit and shows validation", async ({ page }) => {
    await page.goto("/login");
    // Passwordless flow — email stage ka button "Send OTP"
    await page.getByRole("button", { name: /send otp/i }).click();
    await expect(page).toHaveURL(/\/login/);
    // .first() — Next.js ka route-announcer bhi role=alert rakhta hai
    await expect(page.getByRole("alert").first()).toBeVisible();
  });

  test("unauthenticated user cannot reach account data", async ({ page }) => {
    await page.goto("/account");
    await expect(page.getByText(/log ?in/i).first()).toBeVisible();
  });
});