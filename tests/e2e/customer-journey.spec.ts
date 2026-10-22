import { expect, test } from "@playwright/test";

test("customer can browse products, login, and reach checkout", async ({ page }) => {
  // Dev server + order POST slow ho sakta hai — budget double
  test.setTimeout(90_000);
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /nature's finest/i })).toBeVisible();

  await page.goto("/shop");
  await expect(page).toHaveURL(/\/shop/);

  await expect(page.getByRole("heading", { name: /shop all|results for/i })).toBeVisible({ timeout: 30_000 });
  await expect(
    page.getByRole("link", { name: /premium california almonds/i }).first(),
  ).toBeVisible({ timeout: 30_000 });

  const addButton = page.getByRole("button", { name: /^add to cart$/i }).first();
  await expect(addButton).toBeVisible({ timeout: 30_000 });
  await addButton.click();

  await page.goto("/cart");
  await expect(page.getByRole("heading", { name: /cart/i })).toBeVisible();

  await page.goto("/login?redirect=/checkout");
  await expect(page).toHaveURL(/\/login/);

  // Passwordless UI: email stage -> Send OTP -> OTP step dikhe
  await page.getByLabel("Email", { exact: true }).fill("priya@example.com");
  await page.getByRole("button", { name: /send otp/i }).click();
  await expect(page.getByText(/6-digit code/i)).toBeVisible({ timeout: 15_000 });

  // Session API se set karo (password login API legacy/admin ke liye ab bhi
  // chalta hai; CI production build me OTP email deliver nahi hota).
  const login = await page.request.post("/api/auth/login", {
    data: { email: "priya@example.com", password: "Demo@123" },
  });
  const setCookie = login.headers()["set-cookie"] ?? "";
  const cookie = (Array.isArray(setCookie) ? setCookie[0] : setCookie).match(
    /dfa_session=([^;]+)/,
  );
  expect(cookie, "could not obtain a session cookie").toBeTruthy();
  const origin = new URL(page.url()).origin;
  await page.context().addCookies([
    { name: "dfa_session", value: cookie![1], url: origin },
  ]);

  await page.goto("/checkout");
  await expect(page).toHaveURL(/\/checkout/);
  await expect(page.getByRole("heading", { name: /checkout/i })).toBeVisible();

  await page.getByLabel("Full name", { exact: true }).fill("Priya Sharma");
  await page.getByLabel("Phone", { exact: true }).fill("9876543210");
  await page.getByLabel("Email", { exact: true }).fill("priya@example.com");
  await page.getByLabel("Address", { exact: true }).fill("12 Market Road, Bengaluru");
  await page.getByLabel("City", { exact: true }).fill("Bengaluru");
  await page.getByLabel("State", { exact: true }).fill("Karnataka");
  await page.getByLabel("PIN code", { exact: true }).fill("560001");
  await page.getByRole("button", { name: /place order/i }).click();

  await expect(page.getByText(/order placed|thank you/i)).toBeVisible();
});
