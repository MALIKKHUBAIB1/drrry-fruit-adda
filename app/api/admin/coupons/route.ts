import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, sameOrigin, toInt } from "@/lib/server/security";

// GET /api/admin/coupons
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const db = await readDb();
  return NextResponse.json({ coupons: db.coupons });
}

function parse(body: Record<string, unknown>) {
  const code = cleanText(body.code, 20).toUpperCase();
  const pct = toInt(body.pct, 1, 90);
  const min = toInt(body.min, 0, 1000000);
  const label = cleanText(body.label, 120);
  if (!code) return { error: "code required." };
  if (pct < 1) return { error: "pct must be 1–90." };
  return { data: { code, pct, min, label: label || `${pct}% off above ₹${min}`, active: body.active !== false } };
}

// POST /api/admin/coupons
export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const v = parse(body);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const coupon = await updateDb((db) => {
    if (db.coupons.some((c) => c.code === v.data.code)) throw new Error("Coupon already exists.");
    db.coupons.push(v.data);
    return v.data;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (coupon && "__error" in coupon) return NextResponse.json({ error: coupon.__error }, { status: 409 });
  return NextResponse.json({ coupon }, { status: 201 });
}

// PUT /api/admin/coupons { code, pct?, min?, label?, active? }
export async function PUT(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const code = cleanText(body.code, 20).toUpperCase();
  if (!code) return NextResponse.json({ error: "code required." }, { status: 400 });

  const updated = await updateDb((db) => {
    const c = db.coupons.find((x) => x.code === code);
    if (!c) return null;
    if (body.pct !== undefined) {
      const pct = toInt(body.pct, 1, 90);
      if (pct < 1) throw new Error("pct must be 1–90.");
      c.pct = pct;
    }
    if (body.min !== undefined) {
      const min = toInt(body.min, 0, 1000000);
      c.min = min;
    }
    if (typeof body.label === "string" && body.label.trim()) c.label = cleanText(body.label, 120);
    if (body.active !== undefined) c.active = body.active === true;
    return c;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (updated && "__error" in updated) return NextResponse.json({ error: updated.__error }, { status: 400 });
  if (!updated) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  return NextResponse.json({ coupon: updated });
}

// DELETE /api/admin/coupons?code=
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const code = cleanText(new URL(req.url).searchParams.get("code") ?? "", 20).toUpperCase();
  if (!code) return NextResponse.json({ error: "code required." }, { status: 400 });
  const removed = await updateDb((db) => {
    const i = db.coupons.findIndex((c) => c.code === code);
    if (i < 0) return false;
    db.coupons.splice(i, 1);
    return true;
  });
  if (!removed) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
