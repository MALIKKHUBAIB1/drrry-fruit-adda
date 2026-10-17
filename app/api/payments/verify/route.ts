import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import { cleanText, readJsonSafe, sameOrigin } from "@/lib/server/security";
import crypto from "node:crypto";

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

// POST /api/payments/verify { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderId }
// Signature verify karo (HMAC SHA256), phir order ko "paid" mark karo.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const razorpay_order_id = cleanText(body.razorpay_order_id, 60);
  const razorpay_payment_id = cleanText(body.razorpay_payment_id, 60);
  const razorpay_signature = cleanText(body.razorpay_signature, 120);
  const orderId = cleanText(body.orderId, 40);

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment details." }, { status: 400 });
  }
  if (!RAZORPAY_KEY_SECRET) {
    return NextResponse.json({ error: "Razorpay not configured." }, { status: 503 });
  }

  const expected = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  // Timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(razorpay_signature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: "Payment signature mismatch." }, { status: 400 });
  }

  // Order paid mark karo
  const order = await updateDb((db) => {
    const o = db.orders.find((x) => x.id === orderId && x.userId === user.id);
    if (!o) return null;
    if (o.payment !== "online") return o;
    (o as unknown as Record<string, unknown>).paymentId = razorpay_payment_id;
    (o as unknown as Record<string, unknown>).razorpayOrderId = razorpay_order_id;
    (o as unknown as Record<string, unknown>).paidAt = new Date().toISOString();
    (o as unknown as Record<string, unknown>).status = "placed";
    return o;
  });

  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ ok: true, order });
}
