import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText } from "@/lib/server/security";

// GET /api/admin/stats
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });

  const db = await readDb();
  const live = db.orders.filter((o) => o.status !== "cancelled");
  const revenue = live.reduce((s, o) => s + o.total, 0);
  const byStatus = ["placed", "shipped", "delivered", "cancelled"].map((st) => ({
    status: st,
    count: db.orders.filter((o) => o.status === st).length,
  }));
  const topProducts = Object.entries(
    live.flatMap((o) => o.items).reduce<Record<string, { name: string; qty: number; revenue: number }>>((acc, it) => {
      const cur = acc[it.slug] ?? { name: it.name, qty: 0, revenue: 0 };
      cur.qty += it.qty;
      cur.revenue += it.price * it.qty;
      acc[it.slug] = cur;
      return acc;
    }, {}),
  )
    .map(([slug, v]) => ({ slug, ...v }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  return NextResponse.json({
    users: db.users.length,
    products: db.products.length,
    orders: db.orders.length,
    revenue,
    avgOrderValue: live.length ? Math.round(revenue / live.length) : 0,
    byStatus,
    topProducts,
    pendingContacts: db.contacts.length,
    subscribers: db.newsletter.length,
    reviews: db.reviews.length,
  });
}
