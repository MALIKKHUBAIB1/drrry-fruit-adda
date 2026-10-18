import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config.
 *
 * Runs against an ISOLATED local instance only:
 *   TEST_BASE_URL=http://localhost:3100 npm run test:e2e
 *
 * Guard: refuses to run against anything that is not localhost unless
 * ALLOW_REMOTE_E2E=1 is explicitly set — so these tests can never
 * accidentally hit production with destructive flows (order create/delete,
 * account delete).
 */
const BASE_URL = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3001";
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(BASE_URL);

if (!isLocal && process.env.ALLOW_REMOTE_E2E !== "1") {
  throw new Error(
    `Refusing to run E2E against ${BASE_URL}. ` +
      `These tests create/delete orders. Set ALLOW_REMOTE_E2E=1 only for a staging sandbox.`,
  );
}

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  // The JSON-file datastore cannot handle parallel writers safely.
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    ignoreHTTPSErrors: true,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"] },
      testMatch: /responsive\.spec\.ts/,
    },
  ],
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command: "npm run dev -- --hostname 127.0.0.1 --port 3001",
        url: BASE_URL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});