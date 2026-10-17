import { NextResponse } from "next/server";
import { readDb } from "@/lib/server/db";
import {
  cleanText,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

// GET /api/coupons — active coupon list
// POST /api/coupons { code, subtotal } — validate & compute discount
export async function GET() {
  const db = await readDb();
  return NextResponse.json({
    coupons: db.coupons.filter((c) => c.active),
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
