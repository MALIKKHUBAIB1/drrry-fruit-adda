import { NextResponse } from "next/server";
import { readDb } from "@/lib/server/db";

// GET /api/coupons — active coupon list
// POST /api/coupons { code, subtotal } — validate & compute discount
export async function GET() {
  const db = await readDb();
  return NextResponse.json({
    coupons: db.coupons.filter((c) => c.active),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  const subtotal = Number(body.subtotal ?? 0);

  const db = await readDb();
  const coupon = db.coupons.find((c) => c.code === code && c.active);
  if (!coupon) {
    return NextResponse.json({ valid: false, error: "This discount code isn't valid." }, { status: 400 });
  }
  if (subtotal < coupon.min) {
    return NextResponse.json(
      {
        valid: false,
        error: `Add items worth ₹${coupon.min.toLocaleString("en-IN")} to use ${coupon.code}.`,
      },
      { status: 400 },
    );
  }
  const discount = Math.round((subtotal * coupon.pct) / 100);
  return NextResponse.json({ valid: true, coupon, discount });
}
