import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";

// GET /api/admin/coupons — saare coupons (inactive samet)
// POST /api/admin/coupons { code, pct, min, label, active }
// PUT /api/admin/coupons { code, pct?, min?, label?, active? }
// DELETE /api/admin/coupons?code=
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const db = await readDb();
  return NextResponse.json({ coupons: db.coupons });
}

function parse(body: Record<string, unknown>) {
  const code = String(body.code ?? "").trim().toUpperCase();
  const pct = Math.floor(Number(body.pct ?? NaN));
  const min = Math.floor(Number(body.min ?? NaN));
  const label = String(body.label ?? "").trim();
  if (!code) return { error: "code required." };
  if (!Number.isFinite(pct) || pct < 1 || pct > 90) return { error: "pct must be 1–90." };
  if (!Number.isFinite(min) || min < 0) return { error: "min must be 0 or more." };
  return { data: { code, pct, min, label: label || `${pct}% off above ₹${min}`, active: body.active !== false } };
}

export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const v = parse(await req.json().catch(() => ({})));
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });
  const coupon = await updateDb((db) => {
    if (db.coupons.some((c) => c.code === v.data.code)) throw new Error("Coupon already exists.");
    db.coupons.push(v.data);
    return v.data;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (coupon && "__error" in coupon) return NextResponse.json({ error: coupon.__error }, { status: 409 });
  return NextResponse.json({ coupon }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const body = await req.json().catch(() => ({}));
  const code = String(body.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "code required." }, { status: 400 });
  const updated = await updateDb((db) => {
    const c = db.coupons.find((x) => x.code === code);
    if (!c) return null;
    if (body.pct !== undefined) {
      const pct = Math.floor(Number(body.pct));
      if (!Number.isFinite(pct) || pct < 1 || pct > 90) throw new Error("pct must be 1–90.");
      c.pct = pct;
    }
    if (body.min !== undefined) {
      const min = Math.floor(Number(body.min));
      if (!Number.isFinite(min) || min < 0) throw new Error("min must be 0 or more.");
      c.min = min;
    }
    if (typeof body.label === "string" && body.label.trim()) c.label = body.label.trim();
    if (body.active !== undefined) c.active = body.active === true;
    return c;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (updated && "__error" in updated) return NextResponse.json({ error: updated.__error }, { status: 400 });
  if (!updated) return NextResponse.json({ error: "Coupon not found." }, { status: 404 });
  return NextResponse.json({ coupon: updated });
}

export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const code = new URL(req.url).searchParams.get("code")?.trim().toUpperCase();
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
