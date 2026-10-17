import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb, type DbPincode } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, isValidPin, readJsonSafe, sameOrigin, toInt } from "@/lib/server/security";
import {
  FREE_SHIPPING_ABOVE,
  ZONES,
  ZONE_DEFAULT_CHARGES,
  ZONE_LABEL,
  datasetCount,
  listAllPincodes,
  zoneCharge,
} from "@/lib/server/pincode";

// GET /api/admin/pincodes?q=&zone=&page=&limit= — saare India pincodes + dummy charges
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const sp = new URL(req.url).searchParams;
  const q = cleanText(sp.get("q") ?? "", 80);
  const zone = cleanText(sp.get("zone") ?? "", 20);
  const page = toInt(sp.get("page") ?? 1, 1, 100000);
  const limit = Math.min(500, Math.max(10, toInt(sp.get("limit") ?? 50, 10, 500)));
  const includeHidden = sp.get("hidden") === "true";

  const db = await readDb();
  const result = listAllPincodes({
    q,
    zone,
    page,
    limit,
    overrides: db.pincodes,
    hidden: db.hiddenPincodes,
    includeHidden,
  });

  return NextResponse.json({
    ...result,
    overrides: db.pincodes.length,
    hiddenCount: db.hiddenPincodes.length,
    totalInDataset: datasetCount(),
    zones: ZONES,
    zoneLabels: ZONE_LABEL,
    defaultCharges: ZONE_DEFAULT_CHARGES,
    freeShippingAbove: FREE_SHIPPING_ABOVE,
  });
}

// POST /api/admin/pincodes — custom charge set karo (override)
export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const pin = cleanText(body.pin, 6);
  if (!isValidPin(pin)) return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });

  const zoneRaw = cleanText(body.zone, 20) as DbPincode["zone"];
  const zone = ZONES.includes(zoneRaw) ? zoneRaw : undefined;
  const db = await readDb();
  const list = listAllPincodes({ q: pin, page: 1, limit: 5, overrides: db.pincodes });
  const found = list.rows.find((r) => r.pin === pin);

  const city = cleanText(body.city, 80) || found?.city || "";
  const state = cleanText(body.state, 80) || found?.state || "";
  const district = cleanText(body.district, 80) || found?.district || "";
  if (!city || !state)
    return NextResponse.json({ error: "City and state are required." }, { status: 400 });

  const finalZone = zone ?? found?.zone ?? "tier2";
  const shipping = body.shipping !== undefined
    ? toInt(body.shipping, 0, 100000)
    : zoneCharge(finalZone);

  const row: DbPincode = {
    pin,
    city,
    state,
    district,
    zone: finalZone,
    shipping,
    codAvailable: body.codAvailable !== false,
    serviceable: body.serviceable !== false,
  };

  const updated = await updateDb((d) => {
    const i = d.pincodes.findIndex((p) => p.pin === pin);
    // Custom charge set karne par pincode unhide ho jata hai
    d.hiddenPincodes = d.hiddenPincodes.filter((p) => p !== pin);
    if (i >= 0) {
      d.pincodes[i] = row;
      return true as const;
    }
    d.pincodes.push(row);
    return false as const;
  });

  return NextResponse.json({ pincode: row, updated }, { status: updated ? 200 : 201 });
}

// DELETE /api/admin/pincodes?pin=            → hatao + list se hide
// DELETE /api/admin/pincodes?pin=&mode=reset → sirf custom charge hatao, pincode rahe
// Restore ke liye: POST /api/admin/pincodes/restore?pin=
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const sp = new URL(req.url).searchParams;
  const pin = cleanText(sp.get("pin") ?? "", 6);
  if (!pin) return NextResponse.json({ error: "pin required." }, { status: 400 });
  const resetOnly = sp.get("mode") === "reset";

  const db = await readDb();
  const hasOverride = db.pincodes.some((p) => p.pin === pin);

  if (resetOnly) {
    if (!hasOverride)
      return NextResponse.json({ error: "No custom charge set for this PIN." }, { status: 404 });
    await updateDb((d) => {
      d.pincodes = d.pincodes.filter((p) => p.pin !== pin);
    });
    return NextResponse.json({ ok: true, reset: true });
  }

  const exists = hasOverride || datasetCount() > 0;
  await updateDb((d) => {
    d.pincodes = d.pincodes.filter((p) => p.pin !== pin);
    d.hiddenPincodes = [...new Set([...d.hiddenPincodes, pin])];
  });

  if (!exists) return NextResponse.json({ error: "Pincode not found." }, { status: 404 });
  return NextResponse.json({ ok: true, hidden: true });
}