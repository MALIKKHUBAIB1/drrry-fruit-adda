import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText } from "@/lib/server/security";
import { ORDER_STATUSES, STATUS_LABEL } from "@/lib/server/events";

// GET /api/admin/orders?status=&q= — saare orders (admin only)
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });

  const sp = new URL(req.url).searchParams;
  const filterStatus = cleanText(sp.get("status") ?? "", 24);
  const q = cleanText(sp.get("q") ?? "", 80).toLowerCase();
  const db = await readDb();
  let orders = [...db.orders].sort(
    (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
  );
  if (filterStatus) orders = orders.filter((o) => o.status === filterStatus);
  if (q) {
    orders = orders.filter((o) =>
      `${o.id} ${o.name} ${o.email} ${o.phone} ${o.city} ${o.trackingNumber ?? ""}`
        .toLowerCase()
        .includes(q),
    );
  }
  return NextResponse.json({
    orders,
    count: orders.length,
    statuses: ORDER_STATUSES,
    statusLabels: STATUS_LABEL,
  });
}