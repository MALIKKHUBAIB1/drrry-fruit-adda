import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";

// GET /api/admin/users?q= — saare users (password hash kabhi nahi bhejte)
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
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

// PATCH /api/admin/users { id, isAdmin } — admin banao/hatao
export async function PATCH(req: NextRequest) {
  const { status, user } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const body = await req.json().catch(() => ({}));
  const id = String(body.id ?? "");
  if (id === user?.id)
    return NextResponse.json({ error: "You cannot change your own admin status." }, { status: 400 });
  const updated = await updateDb((db) => {
    const u = db.users.find((x) => x.id === id);
    if (!u) return null;
    u.isAdmin = body.isAdmin === true;
    return { id: u.id, name: u.name, email: u.email, isAdmin: u.isAdmin };
  });
  if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ user: updated });
}
