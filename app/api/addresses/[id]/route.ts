import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";

// PUT /api/addresses/:id — edit (sirf apna)
// DELETE /api/addresses/:id — delete (sirf apna)
// POST /api/addresses/:id with { default: true } — default banao (PUT body me isDefault bhejkar bhi)
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const updated = await updateDb((db) => {
    const a = db.addresses.find((x) => x.id === id && x.userId === user.id);
    if (!a) return null;
    for (const k of ["label", "name", "phone", "address", "city", "state", "pin"] as const) {
      if (typeof body[k] === "string" && body[k].trim()) a[k] = body[k].trim();
    }
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
