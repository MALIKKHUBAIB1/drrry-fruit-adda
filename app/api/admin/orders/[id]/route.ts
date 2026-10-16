import { NextResponse, type NextRequest } from "next/server";
import { updateDb, type DbOrder } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";

const STATUSES = ["placed", "shipped", "delivered", "cancelled"] as const;

// PATCH /api/admin/orders/:id { status } — order status badlo
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const next = String(body.status ?? "");
  if (!(STATUSES as readonly string[]).includes(next)) {
    return NextResponse.json(
      { error: `Status must be one of: ${STATUSES.join(", ")}.` },
      { status: 400 },
    );
  }
  const order = await updateDb((db) => {
    const o = db.orders.find((x) => x.id === id);
    if (!o) return null;
    o.status = next as DbOrder["status"];
    return o;
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order });
}
