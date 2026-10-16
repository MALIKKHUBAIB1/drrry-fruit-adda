import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";

// GET /api/admin/orders?status=&q= — saare orders (admin only)
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });

  const sp = new URL(req.url).searchParams;
  const filterStatus = sp.get("status") ?? "";
  const q = (sp.get("q") ?? "").trim().toLowerCase();
  const db = await readDb();
  let orders = [...db.orders].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  if (filterStatus) orders = orders.filter((o) => o.status === filterStatus);
  if (q) {
    orders = orders.filter((o) =>
      `${o.id} ${o.name} ${o.email} ${o.phone} ${o.city}`.toLowerCase().includes(q),
    );
  }
  return NextResponse.json({ orders, count: orders.length });
}
