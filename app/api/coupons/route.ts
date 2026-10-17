import { NextResponse } from "next/server";
import { readDb } from "@/lib/server/db";
import { couponStatus } from "@/lib/server/db";
import {
  cleanText,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

// GET /api/coupons — active coupon list (expired bhi dikhe, status ke saath)
// POST /api/coupons { code, subtotal } — validate & compute discount
export async function GET() {
  const db = await readDb();
  return NextResponse.json({
    coupons: db.coupons.map((c) => ({ ...c, status: couponStatus(c) })),
  });
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const code = cleanText(body.code, 20).toUpperCase();
  const subtotal = Math.max(0, Math.floor(Number(body.subtotal ?? 0)));

  const db = await readDb();
  const coupon = db.coupons.find((c) => c.code === code);
  if (!coupon) {
    return NextResponse.json({ valid: false, error: "This discount code isn't valid." }, { status: 400 });
  }
  const status = couponStatus(coupon);
  if (status === "expired") {
    return NextResponse.json({ valid: false, error: "This coupon has expired.", expired: true }, { status: 400 });
  }
  if (status === "disabled") {
    return NextResponse.json({ valid: false, error: "This coupon is disabled." }, { status: 400 });
  }
  if (status === "limit-reached") {
    return NextResponse.json({ valid: false, error: "This coupon has reached its usage limit." }, { status: 400 });
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
  return NextResponse.json({ valid: true, coupon: { ...coupon, status }, discount });
}
