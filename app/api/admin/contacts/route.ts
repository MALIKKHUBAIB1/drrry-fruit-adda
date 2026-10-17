import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, sameOrigin } from "@/lib/server/security";

// GET /api/admin/contacts — contact messages (admin only)
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const db = await readDb();
  return NextResponse.json({ contacts: db.contacts, count: db.contacts.length });
}

// DELETE /api/admin/contacts?id=
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const id = cleanText(new URL(req.url).searchParams.get("id") ?? "", 40);
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  const removed = await updateDb((db) => {
    const i = db.contacts.findIndex((c) => c.id === id);
    if (i < 0) return false;
    db.contacts.splice(i, 1);
    return true;
  });
  if (!removed) return NextResponse.json({ error: "Message not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
