import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, it } from "node:test";
import { NextRequest } from "next/server.js";

import { readDb, updateDb, writeDb } from "@/lib/server/db";
import { GET as adminUsersGet, PATCH as adminUsersPatch } from "../../app/api/admin/users/route.ts";
import { GET as categoriesGet } from "../../app/api/categories/route.ts";
import { GET as addressesGet, POST as createAddress } from "../../app/api/addresses/route.ts";
import { POST as registerUser } from "../../app/api/auth/register/route.ts";
import { POST as loginUser } from "../../app/api/auth/login/route.ts";
import { GET as meGet, PATCH as mePatch } from "../../app/api/auth/me/route.ts";
import { POST as logoutUser } from "../../app/api/auth/logout/route.ts";
import { GET as cartGet, PUT as cartPut } from "../../app/api/cart/route.ts";
import { GET as wishlistGet, POST as wishlistPost } from "../../app/api/wishlist/route.ts";
import { GET as ordersGet, POST as createOrder } from "../../app/api/orders/route.ts";
import { GET as productsGet } from "../../app/api/products/route.ts";
import { POST as verifyPayment } from "../../app/api/payments/verify/route.ts";

type JsonBody = Record<string, unknown> | undefined;

// RequestInit ka body plain-object accept nahi karta (TS) — lekin helper
// andar JSON.stringify karta hai, isliye yahan relaxed type chahiye.
type TestRequestInit = Omit<RequestInit, "body"> & { body?: JsonBody };

function makeRequest(url: string, init: TestRequestInit = {}): NextRequest {
  const headers = new Headers(init.headers ?? {});
  if (!headers.has("origin")) headers.set("origin", "http://localhost");
  if (!headers.has("host")) headers.set("host", "localhost");
  if (init.body && !headers.has("content-type")) {
    headers.set("content-type", "application/json");
  }
  return new NextRequest(new URL(url), {
    method: init.method ?? "GET",
    headers,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

function sessionCookieFromResponse(response: Response): string {
  const setCookie = response.headers.get("set-cookie") ?? response.headers.get("Set-Cookie");
  if (!setCookie) return "";
  return setCookie.split(";")[0];
}

let snapshot: Awaited<ReturnType<typeof readDb>>;

beforeEach(async () => {
  snapshot = await readDb();
});

afterEach(async () => {
  await writeDb(snapshot);
});

describe("customer auth and session APIs", () => {
  it("registers, logs in, reads profile, updates name, and logs out", async () => {
    const email = `auth-user-${Date.now()}@example.com`;

    const registerRes = await registerUser(
      makeRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: { name: "Auth Tester", email, password: "StrongPass123" },
      }),
    );
    assert.equal(registerRes.status, 201);

    const session = sessionCookieFromResponse(registerRes);
    assert.ok(session.startsWith("dfa_session="));

    const meRes = await meGet(makeRequest("http://localhost/api/auth/me", { headers: { cookie: session } }));
    assert.equal(meRes.status, 200);
    const meJson = await meRes.json();
    assert.equal(meJson.user.email, email);

    const updateRes = await mePatch(
      makeRequest("http://localhost/api/auth/me", {
        method: "PATCH",
        body: { name: "Updated User" },
        headers: { cookie: session },
      }),
    );
    assert.equal(updateRes.status, 200);
    const updated = await updateRes.json();
    assert.equal(updated.user.name, "Updated User");

    const logoutRes = await logoutUser(
      makeRequest("http://localhost/api/auth/logout", {
        method: "POST",
        headers: { cookie: session },
      }),
    );
    assert.equal(logoutRes.status, 200);

    const afterLogout = await meGet(
      makeRequest("http://localhost/api/auth/me", { headers: { cookie: session } }),
    );
    assert.equal(afterLogout.status, 401);
  });

  it("rejects invalid auth credentials and blocked same-origin requests", async () => {
    const email = `bad-auth-${Date.now()}@example.com`;

    const invalidRegister = await registerUser(
      makeRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: { name: "A", email: "nope", password: "short" },
      }),
    );
    assert.equal(invalidRegister.status, 400);

    const passwordBad = await loginUser(
      makeRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email, password: "wrong-pass" },
      }),
    );
    assert.equal(passwordBad.status, 401);

    const badOrigin = await loginUser(
      makeRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: "user@example.com", password: "secret" },
        headers: { origin: "https://evil.example" },
      }),
    );
    assert.equal(badOrigin.status, 403);
  });
});

describe("catalog, cart, wishlist and address APIs", () => {
  it("serves public catalog data and allows authenticated cart, wishlist, and address syncs", async () => {
    const db = await readDb();
    const sampleProduct = db.products[0];
    const productsRes = await productsGet(new Request("http://localhost/api/products"));
    assert.equal(productsRes.status, 200);
    const productsJson = await productsRes.json();
    assert.ok(Array.isArray(productsJson.products));
    assert.ok(productsJson.products.length > 0);

    const categoriesRes = await categoriesGet();
    assert.equal(categoriesRes.status, 200);
    const categoriesJson = await categoriesRes.json();
    assert.ok(Array.isArray(categoriesJson.categories));

    const email = `customer-${Date.now()}@example.com`;
    const registerRes = await registerUser(
      makeRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: { name: "Cart User", email, password: "StrongPass123" },
      }),
    );
    const session = sessionCookieFromResponse(registerRes);

    const cartRes = await cartPut(
      makeRequest("http://localhost/api/cart", {
        method: "PUT",
        body: { items: [{ slug: sampleProduct.slug, variant: sampleProduct.variants[0].label, qty: 2 }] },
        headers: { cookie: session },
      }),
    );
    assert.equal(cartRes.status, 200);
    const cartJson = await cartRes.json();
    assert.equal(cartJson.items[0].slug, sampleProduct.slug);

    const cartRead = await cartGet(makeRequest("http://localhost/api/cart", { headers: { cookie: session } }));
    assert.equal(cartRead.status, 200);
    const cartReadJson = await cartRead.json();
    assert.equal(cartReadJson.items.length, 1);

    const wishlistRes = await wishlistPost(
      makeRequest("http://localhost/api/wishlist", {
        method: "POST",
        body: { slug: sampleProduct.slug },
        headers: { cookie: session },
      }),
    );
    assert.equal(wishlistRes.status, 200);
    const wishlistJson = await wishlistRes.json();
    assert.ok(wishlistJson.items.includes(sampleProduct.slug));

    const wishlistRead = await wishlistGet(
      makeRequest("http://localhost/api/wishlist", { headers: { cookie: session } }),
    );
    assert.equal(wishlistRead.status, 200);

    const addressRes = await createAddress(
      makeRequest("http://localhost/api/addresses", {
        method: "POST",
        body: {
          label: "Home",
          name: "Cart User",
          phone: "9876543210",
          address: "12 Market Road, Near City Center",
          city: "Bengaluru",
          state: "Karnataka",
          pin: "560001",
          isDefault: true,
        },
        headers: { cookie: session },
      }),
    );
    assert.equal(addressRes.status, 201);
    const addressJson = await addressRes.json();
    assert.equal(addressJson.address.name, "Cart User");

    const addressesRes = await addressesGet(
      makeRequest("http://localhost/api/addresses", { headers: { cookie: session } }),
    );
    assert.equal(addressesRes.status, 200);
    const addressesJson = await addressesRes.json();
    assert.ok(addressesJson.addresses.length >= 1);
  });
});

describe("orders, payment checks, and admin guards", () => {
  it("creates an order for an authenticated user and rejects invalid payment verification", async () => {
    const email = `order-user-${Date.now()}@example.com`;
    const registerRes = await registerUser(
      makeRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: { name: "Order Buyer", email, password: "StrongPass123" },
      }),
    );
    const session = sessionCookieFromResponse(registerRes);

    const product = (await readDb()).products[0];
    const orderRes = await createOrder(
      makeRequest("http://localhost/api/orders", {
        method: "POST",
        body: {
          items: [{ slug: product.slug, variant: product.variants[0].label, qty: 1 }],
          name: "Order Buyer",
          phone: "9876543210",
          email,
          address: "21 Main Road, Koramangala",
          city: "Bengaluru",
          state: "Karnataka",
          pin: "560001",
          payment: "cod",
        },
        headers: { cookie: session },
      }),
    );
    assert.equal(orderRes.status, 201);
    const orderJson = await orderRes.json();
    assert.ok(orderJson.order?.id);

    const myOrders = await ordersGet(
      makeRequest("http://localhost/api/orders", { headers: { cookie: session } }),
    );
    assert.equal(myOrders.status, 200);
    const ordersJson = await myOrders.json();
    assert.ok(ordersJson.orders.length >= 1);

    const paymentVerify = await verifyPayment(
      makeRequest("http://localhost/api/payments/verify", {
        method: "POST",
        body: {
          razorpay_order_id: "order_INVALID",
          razorpay_payment_id: "pay_INVALID",
          razorpay_signature: "broken-signature",
          orderId: orderJson.order.id,
        },
        headers: { cookie: session },
      }),
    );
    assert.ok(paymentVerify.status === 400 || paymentVerify.status === 503);
  });

  it("blocks customer access to admin APIs and allows admin access after role grant", async () => {
    const customerEmail = `admin-check-${Date.now()}@example.com`;
    const customerRes = await registerUser(
      makeRequest("http://localhost/api/auth/register", {
        method: "POST",
        body: { name: "Normal User", email: customerEmail, password: "StrongPass123" },
      }),
    );
    const customerSession = sessionCookieFromResponse(customerRes);

    const customerBlocked = await adminUsersGet(
      makeRequest("http://localhost/api/admin/users", { headers: { cookie: customerSession } }),
    );
    assert.equal(customerBlocked.status, 403);

    await updateDb((db) => {
      const user = db.users.find((u) => u.email === customerEmail);
      if (user) user.isAdmin = true;
      return db;
    });

    const adminReq = await loginUser(
      makeRequest("http://localhost/api/auth/login", {
        method: "POST",
        body: { email: customerEmail, password: "StrongPass123" },
      }),
    );
    const adminSession = sessionCookieFromResponse(adminReq);

    const adminList = await adminUsersGet(
      makeRequest("http://localhost/api/admin/users", { headers: { cookie: adminSession } }),
    );
    assert.equal(adminList.status, 200);
    const adminJson = await adminList.json();
    assert.ok(Array.isArray(adminJson.users));

    const adminPatch = await adminUsersPatch(
      makeRequest("http://localhost/api/admin/users", {
        method: "PATCH",
        body: { id: "unknown-user", isAdmin: true },
        headers: { cookie: adminSession },
      }),
    );
    assert.ok(adminPatch.status === 404 || adminPatch.status === 400);
  });
});
