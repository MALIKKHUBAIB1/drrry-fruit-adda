import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import {
  cleanText,
  isValidPhone,
  isValidPin,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

// PUT /api/addresses/:id — edit (sirf apna)
// DELETE /api/addresses/:id — delete (sirf apna)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await params;

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const updated = await updateDb((db) => {
    const a = db.addresses.find((x) => x.id === id && x.userId === user.id);
    if (!a) return null;
    if (typeof body.label === "string") a.label = cleanText(body.label, 30) || a.label;
    if (typeof body.name === "string" && cleanText(body.name, 80).length >= 3) a.name = cleanText(body.name, 80);
    if (typeof body.phone === "string" && isValidPhone(body.phone)) a.phone = body.phone.trim();
    if (typeof body.address === "string" && cleanText(body.address, 300).length >= 10) a.address = cleanText(body.address, 300);
    if (typeof body.city === "string") a.city = cleanText(body.city, 60);
    if (typeof body.state === "string") a.state = cleanText(body.state, 60);
    if (typeof body.pin === "string" && isValidPin(body.pin)) a.pin = body.pin.trim();
    if (body.isDefault === true) {
      db.addresses.filter((x) => x.userId === user.id).forEach((x) => (x.isDefault = false));
      a.isDefault = true;
    }
    return a;
  });
  if (!updated) return NextResponse.json({ error: "Address not found." }, { status: 404 });
  return NextResponse.json({ address: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await params;
  const removed = await updateDb((db) => {
    const i = db.addresses.findIndex((x) => x.id === id && x.userId === user.id);
    if (i < 0) return false;
    const [gone] = db.addresses.splice(i, 1);
    if (gone.isDefault) {
      const next = db.addresses.find((x) => x.userId === user.id);
      if (next) next.isDefault = true;
    }
    return true;
  });
  if (!removed) return NextResponse.json({ error: "Address not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
