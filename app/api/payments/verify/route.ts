import { NextResponse, type NextRequest } from "next/server";
import Razorpay from "razorpay";
import crypto from "node:crypto";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import { cleanText, rateLimit, readJsonSafe, sameOrigin } from "@/lib/server/security";
import { publish } from "@/lib/server/events";
import { sendOrderStatusEmail } from "@/lib/server/ordermail";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim() || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

/** Status jisme order "placed" ho sakta hai. Cancelled/delivered resurrect nahi hote. */
const PAYABLE_STATUSES = new Set(["placed"]);

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a, "utf-8");
  const bb = Buffer.from(b, "utf-8");
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}

/**
 * POST /api/payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId }
 *
 * SECURITY (pehle 3 vulnerabilities the):
 *
 *  1. CROSS-ORDER REUSE (critical)
 *     Pehle koi bhi valid payment apne kisi bhi order pe "laga" sakta tha —
 *     ₹1 ka payment bana kar ₹5,000 ka order paid dikha sakta tha.
 *     Ab order.razorpayOrderId === razorpay_order_id enforce hota hai.
 *
 *  2. AMOUNT NEVER VERIFIED (critical)
 *     Ab hum Razorpay se server-to-server payment fetch karke confirm karte hain:
 *     amount === order.total * 100, status === "captured", currency === INR.
 *     Client kuch bhi bheje, verify hoga tabhi order paid hoga.
 *
 *  3. REPLAY (high)
 *     - payment_id dobara use (dusre order pe) → reject
 *     - already-paid order pe dobara → idempotent OK (koi double credit nahi)
 *     - cancelled/delivered order → reject
 *     - rate limited
 */
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || user.id;
  const rl = rateLimit(`pay-verify:${ip}`, 20, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please try again." },
      { status: 429 },
    );
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const razorpay_order_id = cleanText(body.razorpay_order_id, 60);
  const razorpay_payment_id = cleanText(body.razorpay_payment_id, 60);
  const razorpay_signature = cleanText(body.razorpay_signature, 200);
  const orderId = cleanText(body.orderId, 40);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !orderId) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }
  if (!RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Razorpay not configured." }, { status: 503 });
  }

  // ---- HMAC signature (timing-safe) ----
  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  if (!safeEqual(expected, razorpay_signature)) {
    return NextResponse.json({ error: "Payment signature mismatch." }, { status: 400 });
  }

  // ---- Order lookup + ownership ----
  const db = await readDb();
  const order = db.orders.find((o) => o.id === orderId && o.userId === user.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  // ---- BINDING: ye payment isi order ka hona chahiye ----
  if (!order.razorpayOrderId) {
    return NextResponse.json(
      { error: "No payment session started for this order." },
      { status: 400 },
    );
  }
  if (!safeEqual(order.razorpayOrderId, razorpay_order_id)) {
    return NextResponse.json(
      { error: "Payment does not belong to this order." },
      { status: 400 },
    );
  }

  // ---- REPLAY: ye payment id kisi aur order pe to nahi lagaya? ----
  const usedElsewhere = db.orders.find(
    (o) => o.paymentId === razorpay_payment_id && o.id !== order.id,
  );
  if (usedElsewhere) {
    return NextResponse.json(
      { error: "This payment is already linked to another order." },
      { status: 409 },
    );
  }

  // ---- Already paid? Idempotent success (koi double credit nahi) ----
  if (order.paymentStatus === "paid" || order.paidAt) {
    if (order.paymentId === razorpay_payment_id) {
      return NextResponse.json({ ok: true, alreadyPaid: true, orderId: order.id });
    }
    return NextResponse.json(
      { error: "This order already has a different payment recorded." },
      { status: 409 },
    );
  }

  // ---- Status transition guard: cancelled/delivered resurrect nahi hote ----
  if (!PAYABLE_STATUSES.has(order.status)) {
    return NextResponse.json(
      { error: `Order is ${order.status} and cannot be paid now.` },
      { status: 409 },
    );
  }

  // ---- SERVER-SIDE verification with Razorpay (source of truth) ----
  const expectedAmount = Math.round(order.total * 100);
  let rzpPayment: { amount?: number; currency?: string; status?: string; order_id?: string };

  try {
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    rzpPayment = (await rzp.payments.fetch(razorpay_payment_id)) as typeof rzpPayment;

    if (rzpPayment.order_id && !safeEqual(String(rzpPayment.order_id), razorpay_order_id)) {
      return NextResponse.json({ error: "Payment/order mismatch." }, { status: 400 });
    }
    if (Number(rzpPayment.amount) !== expectedAmount) {
      return NextResponse.json(
        {
          error: "Payment amount does not match order total.",
          expected: expectedAmount / 100,
          received: Number(rzpPayment.amount ?? 0) / 100,
        },
        { status: 400 },
      );
    }
    if (rzpPayment.currency && rzpPayment.currency !== "INR") {
      return NextResponse.json({ error: "Unexpected currency." }, { status: 400 });
    }
    if (rzpPayment.status !== "captured") {
      return NextResponse.json(
        { error: `Payment not completed (status: ${rzpPayment.status}).` },
        { status: 400 },
      );
    }
  } catch (e) {
    // Razorpay reachable nahi — fail closed. Order ko "paid" mark karna
    // galat ho, verification fail karna safe hai.
    const msg = e instanceof Error ? e.message : "unknown";
    await updateDb((d) => {
      const o = d.orders.find((x) => x.id === orderId);
      if (o) o.paymentStatus = "failed";
      return d;
    }).catch(() => {});
    return NextResponse.json(
      { error: "Couldn't confirm payment with the bank. If you were charged, contact support.", detail: msg },
      { status: 502 },
    );
  }

  // ---- Sab checks pass — ab mark karo ----
  const now = new Date().toISOString();
  const updated = await updateDb((d) => {
    const o = d.orders.find((x) => x.id === orderId && x.userId === user.id);
    if (!o) return null;
    // Re-check inside write (race condition guard)
    if (o.paymentStatus === "paid" || o.paidAt) return o;
    o.paymentId = razorpay_payment_id;
    o.paidAt = now;
    o.paidAmount = expectedAmount / 100;
    o.paymentStatus = "paid";
    o.statusHistory = [
      ...(o.statusHistory ?? []),
      { status: "placed" as const, at: now, note: "Payment verified" },
    ];
    return o;
  });

  if (!updated) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  publish({ orderId, status: "placed" });

  // Payment success = confirmed order — yahan confirmation email (COD wale
  // order create hi pe chuki hoti hain). Best effort.
  try {
    await sendOrderStatusEmail(updated, "placed");
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "order paid email crashed",
        orderId,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
  }

  // Poora order object mat bhejo — sirf confirmation
  return NextResponse.json({
    ok: true,
    orderId: order.id,
    amount: expectedAmount / 100,
    paidAt: now,
  });
}