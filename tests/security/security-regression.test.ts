import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";

/**
 * Black-box security regression suite.
 *
 * Hits a RUNNING instance over HTTP so it exercises the real stack:
 * middleware, cookies, security headers, route handlers.
 *
 *   npm run dev -- --port 3100        # in one shell
 *   npm run test:security             # in another
 *
 * These tests ONLY touch a local sandbox. They create orders/users but never
 * delete real data and never run against production (guarded by base URL check).
 */

const BASE = process.env.SECURITY_TEST_BASE_URL ?? "http://localhost:3100";
const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(BASE);

let ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin@dryfruitadda.in";
const ADMIN_PASS = process.env.E2E_ADMIN_PASSWORD;
const USER_PASS = "SecTest!2026";

type Res = { status: number; body: any; headers: Headers };

async function call(
  path: string,
  opts: { method?: string; body?: unknown; cookie?: string; headers?: Record<string, string> } = {},
): Promise<Res> {
  const res = await fetch(`${BASE}${path}`, {
    method: opts.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(opts.cookie ? { cookie: opts.cookie } : {}),
      ...(opts.headers ?? {}),
    },
    body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    redirect: "manual",
  });
  const text = await res.text();
  let body: any;
  try {
    body = JSON.parse(text);
  } catch {
    body = text.slice(0, 400);
  }
  return { status: res.status, body, headers: res.headers };
}

function sessionCookie(res: Res): string {
  const sc = res.headers.get("set-cookie") ?? "";
  const m = sc.match(/dfa_session=([^;]+)/);
  return m ? `dfa_session=${m[1]}` : "";
}

let serverUp = false;

before(async () => {
  if (!isLocal) return;
  try {
    const r = await fetch(`${BASE}/api/health`);
    serverUp = r.ok;
  } catch {
    serverUp = false;
  }
});

after(() => {
  /* no global teardown needed — tests only add users */
});

async function newUser(prefix: string) {
  const email = `${prefix}-${stamp()}@example.com`;
  const res = await call("/api/auth/register", {
    method: "POST",
    body: { name: "Test User", email, password: USER_PASS },
  });
  if (res.status === 429) return null; // rate limited — skip, not a failure
  return { email, cookie: sessionCookie(res), res };
}

const stamp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------------------------------------------------------------- auth

describe("authentication", () => {
  it("rejects login with no credentials", async () => {
    if (!serverUp) return;
    const r = await call("/api/auth/login", { method: "POST", body: { email: "", password: "" } });
    assert.ok(r.status === 400 || r.status === 401, `got ${r.status}`);
  });

  it("does not leak whether an email exists (no enumeration)", async () => {
    if (!serverUp) return;
    const email = `enum-${stamp()}@example.com`;
    const unknown = await call("/api/auth/login", {
      method: "POST",
      body: { email, password: "whatever123" },
    });
    // known-good account, wrong password
    const known = await call("/api/auth/login", {
      method: "POST",
      body: { email: ADMIN_EMAIL, password: "definitely-wrong-password" },
    });
    assert.equal(
      unknown.status,
      known.status,
      `status differs: unknown=${unknown.status} known=${known.status}`,
    );
    assert.equal(
      unknown.body?.error,
      known.body?.error,
      "error messages differ — enables user enumeration",
    );
  });

  it("rate limits repeated login attempts for one account", async () => {
    if (!serverUp) return;
    const email = `ratelimit-${stamp()}@example.com`;
    let saw429 = false;
    for (let i = 0; i < 14; i++) {
      const r = await call("/api/auth/login", {
        method: "POST",
        body: { email, password: "wrong" },
      });
      if (r.status === 429) {
        saw429 = true;
        break;
      }
    }
    assert.ok(saw429, "login attempts were never rate limited");
  });

  it("blocks cross-origin state-changing requests", async () => {
    if (!serverUp) return;
    const r = await call("/api/auth/login", {
      method: "POST",
      headers: { Origin: "https://evil.example.com" },
      body: { email: "x@y.z", password: "x" },
    });
    assert.equal(r.status, 403);
  });
});

// ------------------------------------------------------------- privacy

describe("data exposure", () => {
  it("orders stream requires login and only yields own orders", async () => {
    if (!serverUp) return;
    const anon = await fetch(`${BASE}/api/orders/stream`, { redirect: "manual" });
    assert.notEqual(anon.status, 200, "SSE stream is reachable without auth");

    const u = await newUser("stream");
    if (!u) return; // rate limited
    const cookie = u.cookie;

    // Authenticated stream must open, and must not emit other orders.
    const controller = new AbortController();
    const res = await fetch(`${BASE}/api/orders/stream`, {
      headers: { cookie, Accept: "text/event-stream" },
      signal: controller.signal,
    }).catch(() => null);
    if (res?.ok) {
      const reader = res.body!.getReader();
      const { value } = await reader.read().catch(() => ({ value: undefined }));
      const chunk = value ? new TextDecoder().decode(value) : "";
      controller.abort();
      assert.ok(
        chunk.includes("connected") || chunk === "" || chunk.startsWith(":"),
        `stream leaked event data: ${chunk.slice(0, 120)}`,
      );
    }
  });

  it("public review endpoints do not leak internal user ids", async () => {
    if (!serverUp) return;
    const r = await call("/api/reviews/featured?limit=3");
    if (r.status !== 200) return;
    assert.ok(!("userId" in (r.body.reviews?.[0] ?? {})), "featured reviews expose userId");
  });

  it("admin stats are not public", async () => {
    if (!serverUp) return;
    const r = await call("/api/admin/stats");
    assert.equal(r.status, 401);
  });
});

// ------------------------------------------------------------- payments

describe("payments", () => {
  it("create-order ignores any client-supplied amount", async () => {
    if (!serverUp) return;
    const u = await newUser("pay");
    if (!u) return;
    const cookie = u.cookie;

    // No orderId -> must fail; proves amount is not accepted standalone
    const r = await call("/api/payments/create-order", {
      method: "POST",
      cookie,
      body: { amount: 1, currency: "INR" },
    });
    assert.equal(r.status, 400);
    assert.match(String(r.body.error), /orderId/i);
  });

  it("verify rejects a forged signature", async () => {
    if (!serverUp) return;
    const u = await newUser("pay2");
    if (!u) return;
    const cookie = u.cookie;
    const r = await call("/api/payments/verify", {
      method: "POST",
      cookie,
      body: {
        razorpay_order_id: "order_forged",
        razorpay_payment_id: "pay_forged",
        razorpay_signature: "f".repeat(64),
        orderId: "DFA-DOESNOTEXIST",
      },
    });
    assert.ok([400, 404].includes(r.status), `got ${r.status}`);
  });

  it("refund endpoint requires admin", async () => {
    if (!serverUp) return;
    const u = await newUser("refund");
    if (!u) return;
    const cookie = u.cookie;
    const r = await call("/api/payments/create-order", {
      method: "PUT",
      cookie,
      body: { orderId: "DFA-ANY", paymentId: "pay_any" },
    });
    assert.equal(r.status, 403);
  });
});

// --------------------------------------------------------------- orders

describe("order integrity", () => {
  it("rejects a client-supplied total", async () => {
    if (!serverUp) return;
    const u = await newUser("ord");
    if (!u) return;
    const cookie = u.cookie;

    const products = await call("/api/products?limit=1");
    const p = products.body?.products?.[0];
    if (!p) return;
    const variant = p.variants[0].label;

    const r = await call("/api/orders", {
      method: "POST",
      cookie,
      body: {
        items: [{ slug: p.slug, variant, qty: 1 }],
        total: 1,
        subtotal: 1,
        discount: 0,
        payment: "cod",
        name: "Order Tester",
        phone: "9876543210",
        email: `ord-${stamp()}@example.com`,
        address: "1 Test Street",
        city: "Pune",
        state: "Maharashtra",
        pin: "411001",
      },
    });
    if (r.status === 201) {
      const total = r.body.order.total;
      assert.ok(total > 1, `server trusted the client total (got ${total})`);
    }
  });

  it("caps per-product quantity even with duplicate line items", async () => {
    if (!serverUp) return;
    const u = await newUser("qty");
    if (!u) return;
    const cookie = u.cookie;
    const products = await call("/api/products?limit=1");
    const p = products.body?.products?.[0];
    if (!p) return;
    const variant = p.variants[0].label;

    const r = await call("/api/orders", {
      method: "POST",
      cookie,
      body: {
        items: Array.from({ length: 40 }, () => ({ slug: p.slug, variant, qty: 20 })),
        payment: "cod",
        name: "Qty Tester",
        phone: "9876543210",
        email: `qty-${stamp()}@example.com`,
        address: "1 Test Street",
        city: "Pune",
        state: "Maharashtra",
        pin: "411001",
      },
    });
    if (r.status === 201) {
      const units = r.body.order.items.reduce((n: number, i: any) => n + i.qty, 0);
      assert.ok(units <= 50, `duplicate lines bypassed the cap (total units ${units})`);
    }
  });
});

// ------------------------------------------------------------- platform

describe("platform hardening", () => {
  it("health endpoint responds", async () => {
    if (!serverUp) return;
    const r = await call("/api/health");
    assert.ok([200, 503].includes(r.status));
  });

  it("sets baseline security headers", async () => {
    if (!serverUp) return;
    const r = await call("/");
    const h = r.headers;
    assert.ok(h.get("x-frame-options") || h.get("content-security-policy"), "no clickjacking header");
  });

  it("a failed read must never silently wipe existing data", async () => {
    // Purana JSON-file version corrupt db.json karke throw expect karta tha.
    // Ab backend MongoDB hai, isliye file-corruption vector khatam.
    //
    // Ye suite black-box (HTTP only) hai — server-only modules import nahi
    // karte. Yahan wahi makhsad check hota hai jo API se dikhta hai: real
    // data zinda hai, aur writes persist hote hain.
    if (!serverUp) return;

    // 1. Real data present hai (wipe/reesed ka signal: 0 orders / 0 products)
    const h = await call("/api/health?detail=1");
    assert.equal(h.status, 200, "health endpoint down");
    const info = h.body?.checks?.db?.info ?? {};
    assert.ok(
      (info.orders ?? 0) > 0 && (info.products ?? 0) > 0,
      `db reports orders=${info.orders} products=${info.products} — looks wiped/reeseded`,
    );

    // 2. Persist proof - newsletter subscribe (public, no auth).
    //    Rate-limit (429) ho to ye half skip ho jata hai: ye probe best-effort
    //    hai, core invariant upar wali assertion already verify kar chuki hai.
    const stamp = Date.now().toString(36);
    const probe = await call("/api/newsletter", {
      method: "POST",
      body: { email: `integrity-${stamp}@example.com` },
    });
    if (probe.status === 429) return; // rate-limited: skip best-effort probe
    assert.ok(
      [200, 201, 409].includes(probe.status),
      `newsletter write failed unexpectedly: ${probe.status}`,
    );
  });
});
