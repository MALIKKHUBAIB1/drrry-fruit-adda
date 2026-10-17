import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb, type DbPincode } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, isValidPin, readJsonSafe, sameOrigin, toInt } from "@/lib/server/security";
import { ZONE_DEFAULT_CHARGES, ZONES } from "@/lib/server/pincode";

// GET /api/admin/pincodes?q=&zone= — list
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const sp = new URL(req.url).searchParams;
  const q = cleanText(sp.get("q") ?? "", 80).toLowerCase();
  const zone = cleanText(sp.get("zone") ?? "", 20);

  const db = await readDb();
  let list = [...db.pincodes].sort((a, b) => a.pin.localeCompare(b.pin));
  if (zone) list = list.filter((p) => p.zone === zone);
  if (q) list = list.filter((p) => `${p.pin} ${p.city} ${p.state} ${p.district}`.toLowerCase().includes(q));
  return NextResponse.json({ pincodes: list, count: list.length, zones: ZONES, defaultCharges: ZONE_DEFAULT_CHARGES });
}

// POST /api/admin/pincodes — add/update pincode
export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const pin = cleanText(body.pin, 6);
  if (!isValidPin(pin)) return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });

  const city = cleanText(body.city, 80);
  const state = cleanText(body.state, 80);
  const district = cleanText(body.district, 80);
  const zoneRaw = cleanText(body.zone, 20) as DbPincode["zone"];
  if (!city) return NextResponse.json({ error: "City is required." }, { status: 400 });
  if (!state) return NextResponse.json({ error: "State is required." }, { status: 400 });
  if (!ZONES.includes(zoneRaw)) return NextResponse.json({ error: "Invalid zone." }, { status: 400 });

  const shipping = toInt(body.shipping, 0, 100000);
  const codAvailable = body.codAvailable !== false;
  const serviceable = body.serviceable !== false;

  const saved = await updateDb((db) => {
    const i = db.pincodes.findIndex((p) => p.pin === pin);
    const row: DbPincode = { pin, city, state, district, zone: zoneRaw, shipping, codAvailable, serviceable };
    if (i >= 0) {
      db.pincodes[i] = row;
      return { row, updated: true as const };
    }
    db.pincodes.push(row);
    return { row, updated: false as const };
  });

  return NextResponse.json({ pincode: saved.row, updated: saved.updated }, { status: saved.updated ? 200 : 201 });
}

// DELETE /api/admin/pincodes?pin= — hatao (wapas default zone charge lagega)
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const pin = cleanText(new URL(req.url).searchParams.get("pin") ?? "", 6);
  if (!pin) return NextResponse.json({ error: "pin required." }, { status: 400 });
  const removed = await updateDb((db) => {
    const i = db.pincodes.findIndex((p) => p.pin === pin);
    if (i < 0) return false;
    db.pincodes.splice(i, 1);
    return true;
  });
  if (!removed) return NextResponse.json({ error: "Pincode not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}