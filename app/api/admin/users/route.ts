import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, sameOrigin } from "@/lib/server/security";

// GET /api/admin/users?q=
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const q = cleanText(new URL(req.url).searchParams.get("q") ?? "", 80).toLowerCase();
  const db = await readDb();
  let users = db.users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    isAdmin: !!u.isAdmin,
    createdAt: u.createdAt,
    orders: db.orders.filter((o) => o.userId === u.id).length,
  }));
  if (q) users = users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q));
  return NextResponse.json({ users, count: users.length });
}

// PATCH /api/admin/users { id, isAdmin }
export async function PATCH(req: NextRequest) {
  const { status, user } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const id = cleanText(body.id, 40);
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  if (id === user?.id)
    return NextResponse.json({ error: "You cannot change your own admin status." }, { status: 400 });

  const isAdmin = body.isAdmin === true;
  const updated = await updateDb((db) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    u.isAdmin = isAdmin;
    return { id: u.id, name: u.name, email: u.email, isAdmin: u.isAdmin };
  });
  if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ user: updated });
}
