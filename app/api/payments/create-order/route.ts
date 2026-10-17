import { NextResponse, type NextRequest } from "next/server";
import Razorpay from "razorpay";
import { getSessionUser } from "@/lib/server/auth";
import { cleanText, readJsonSafe, sameOrigin, toInt } from "@/lib/server/security";

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID?.trim() || "";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET?.trim() || "";

// POST /api/payments/create-order { amount (paise), receipt? } — Razorpay order banao
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    return NextResponse.json(
      { error: "Razorpay keys not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env." },
      { status: 503 },
    );
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const amount = toInt(body.amount, 1, 10_000_000); // paise
  const currency = cleanText(body.currency, 8) || "INR";
  const receipt = cleanText(body.receipt, 40) || `rcpt_${Date.now()}`;

  if (amount < 100) {
    return NextResponse.json({ error: "Minimum order amount is ₹1." }, { status: 400 });
  }

  try {
    const rzp = new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
    const order = await rzp.orders.create({
      amount,
      currency,
      receipt,
      notes: { userId: user.id, email: user.email },
    });
    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: RAZORPAY_KEY_ID,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Couldn't create payment order." },
      { status: 502 },
    );
  }
}
