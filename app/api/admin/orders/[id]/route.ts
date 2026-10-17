import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb, type DbOrder } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, sameOrigin } from "@/lib/server/security";

const STATUSES = ["placed", "shipped", "delivered", "cancelled"] as const;

// GET /api/admin/orders?status=&q=
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });

  const sp = new URL(req.url).searchParams;
  const filterStatus = cleanText(sp.get("status") ?? "", 20);
  const q = cleanText(sp.get("q") ?? "", 80).toLowerCase();
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

// PATCH /api/admin/orders/:id { status }
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const { id } = await params;
  const safeId = cleanText(id, 40);

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const next = cleanText(body.status, 20);
  if (!(STATUSES as readonly string[]).includes(next)) {
    return NextResponse.json(
      { error: `Status must be one of: ${STATUSES.join(", ")}.` },
      { status: 400 },
    );
  }

  const order = await updateDb((db) => {
    const o = db.orders.find((x) => x.id === safeId);
    if (!o) return null;
    o.status = next as DbOrder["status"];
    return o;
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order });
}
