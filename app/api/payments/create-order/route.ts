import { NextResponse, type NextRequest } from "next/server";
import Razorpay from "razorpay";
import { getProducts, readDb, updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import {
  ADMIN_DENIED,
  requireAdmin,
} from "@/lib/server/admin";
import { cleanText, rateLimit, readJsonSafe, sameOrigin } from "@/lib/server/security";
import { publish } from "@/lib/server/events";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim() || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

/**
 * POST /api/payments/create-order { orderId }
 *
 * SECURITY (pehle yahan bada vulnerability tha):
 *  ❌ Pehle client { amount } bhejta tha aur server uspe bharosa karta tha.
 *     DevTools me amount: 100 karke koi bhi ₹5,000 ka order ₹1 me pay kar
 *     sakta tha. Ab amount KABHI client se nahi aata.
 *  ✅ Amount server DB se order.total pe compute hota hai.
 *  ✅ Order user ka hona, online payment hona, aur paid na hona — sab check.
 *  ✅ Razorpay order id hamare order se bind ho jaata hai, taaki verify
 *     me cross-order reuse possible na ho.
 *  ✅ Idempotent — same order pe dubara call karne pe naya order nahi banta.
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || user.id;
  const rl = rateLimit(`pay-create:${ip}`, 15, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many payment attempts. Please try again later." },
      { status: 429 },
    );
  }

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: "Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env." },
      { status: 503 },
    );
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const orderId = cleanText(body.orderId, 40);
  if (!orderId) {
    return NextResponse.json({ error: "orderId is required." }, { status: 400 });
  }

  // ---- Order validate karo ----
  const db = await readDb();
  const order = db.orders.find((o) => o.id === orderId && o.userId === user.id);
  if (!order) {
    return NextResponse.json({ error: "Order not found." }, { status: 404 });
  }
  if (order.payment !== "online") {
    return NextResponse.json({ error: "This order is not an online payment order." }, { status: 400 });
  }
  if (order.paymentStatus === "paid" || order.paidAt) {
    return NextResponse.json({ error: "This order is already paid." }, { status: 409 });
  }
  // verify() sirf "placed" accept karta hai — create-order bhi wahi guard rakhe,
  // warna customer delivered order pe charge ho jaata tha aur verify 409 deta tha.
  if (order.status !== "placed") {
    return NextResponse.json(
      { error: `Order is ${order.status} and cannot be paid now.` },
      { status: 409 },
    );
  }
  // Payment se pehle stock dobara check — beech me kuch out of stock ho sakta hai
  const products = await getProducts();
  const outOfStock = order.items.filter((it) => {
    const pr = products.find((x) => x.slug === it.slug);
    return !pr || !pr.inStock || !pr.variants.some((v) => v.label === it.variant);
  });
  if (outOfStock.length) {
    return NextResponse.json(
      { error: `${outOfStock[0].name} is out of stock. Please review your cart.` },
      { status: 409 },
    );
  }

  // ---- Amount SERVER se compute (client ka amount bilkul use nahi hota) ----
  const amount = Math.round(order.total * 100);
  if (!Number.isFinite(amount) || amount < 100) {
    return NextResponse.json({ error: "Invalid order amount." }, { status: 400 });
  }

  // Already bana hua Razorpay order hai? Reuse (idempotent) — naya mat banao
  if (order.razorpayOrderId) {
    return NextResponse.json({
      orderId: order.razorpayOrderId,
      amount,
      currency: "INR",
      keyId: RAZORPAY_KEY_ID,
      reused: true,
    });
  }

  try {
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    const rzpOrder = await rzp.orders.create({
      amount,
      currency: "INR",
      // Receipt me hamara order id — audit trail ke liye
      receipt: `DFA${order.id}`.slice(0, 40),
      notes: { orderId: order.id, userId: user.id },
    });

    // Order se bind karo (verify me enforce hoga)
    await updateDb((d) => {
      const o = d.orders.find((x) => x.id === orderId && x.userId === user.id);
      if (o) {
        o.razorpayOrderId = rzpOrder.id;
        o.paymentStatus = "pending";
        o.paymentAttempts = (o.paymentAttempts ?? 0) + 1;
      }
      return d;
    });

    return NextResponse.json({
      orderId: rzpOrder.id,
      amount,
      currency: "INR",
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (e) {
    await updateDb((d) => {
      const o = d.orders.find((x) => x.id === orderId && x.userId === user.id);
      if (o) o.paymentStatus = "failed";
      return d;
    }).catch(() => {});
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't create payment order." },
      { status: 502 },
    );
  }
}

/**
 * POST /api/payments/refund { orderId, paymentId?, amount? } — admin only.
 * Full ya partial refund. Order ka paymentStatus "refunded" ho jaata hai.
 */
export async function PUT(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  if (!RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Razorpay not configured." }, { status: 503 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const orderId = cleanText(body.orderId, 40);
  const paymentId = cleanText(body.paymentId, 60);
  if (!orderId || !paymentId) {
    return NextResponse.json({ error: "orderId and paymentId are required." }, { status: 400 });
  }

  const db = await readDb();
  const order = db.orders.find((o) => o.id === orderId);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  if (order.paymentId !== paymentId) {
    // Cross-check: humne record nahi kiya hai is payment id ko is order pe
    return NextResponse.json({ error: "Payment id does not match this order." }, { status: 400 });
  }
  if (order.paymentStatus === "refunded") {
    return NextResponse.json({ error: "Already refunded." }, { status: 409 });
  }

  try {
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    const refund = await rzp.payments.refund(paymentId, {});

    await updateDb((d) => {
      const o = d.orders.find((x) => x.id === orderId);
      if (o) {
        o.paymentStatus = "refunded";
        o.refundId = refund.id;
        o.refundedAt = new Date().toISOString();
        o.status = "cancelled";
        o.statusHistory = [
          ...(o.statusHistory ?? []),
          { status: "cancelled" as const, at: new Date().toISOString(), note: "Refunded" },
        ];
      }
      return d;
    });
    publish({ orderId, status: "cancelled" });

    return NextResponse.json({ ok: true, refundId: refund.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Refund failed." },
      { status: 502 },
    );
  }
}