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
  const cancelledRevenue = db.orders.filter((o) => o.status === "cancelled").reduce((s, o) => s + o.total, 0);

  const byStatus = ["placed", "shipped", "delivered", "cancelled"].map((st) => ({
    status: st,
    count: db.orders.filter((o) => o.status === st).length,
    revenue: db.orders.filter((o) => o.status === st).reduce((s, o) => s + o.total, 0),
  }));

  // Last 7 days revenue
  const days: { date: string; revenue: number; orders: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const dayOrders = live.filter((o) => o.createdAt.slice(0, 10) === key);
    days.push({
      date: d.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
      orders: dayOrders.length,
    });
  }

  // Payment split
  const codCount = live.filter((o) => o.payment === "cod").length;
  const onlineCount = live.filter((o) => o.payment === "online").length;
  const codRevenue = live.filter((o) => o.payment === "cod").reduce((s, o) => s + o.total, 0);
  const onlineRevenue = live.filter((o) => o.payment === "online").reduce((s, o) => s + o.total, 0);

  // Top customers
  const customerMap = new Map<string, { name: string; email: string; orders: number; spent: number }>();
  for (const o of live) {
    const cur = customerMap.get(o.userId) ?? { name: o.name, email: o.email, orders: 0, spent: 0 };
    cur.orders += 1;
    cur.spent += o.total;
    customerMap.set(o.userId, cur);
  }
  const topCustomers = [...customerMap.values()].sort((a, b) => b.spent - a.spent).slice(0, 5);

  // Category revenue
  const catRevenue: Record<string, number> = {};
  for (const o of live) for (const it of o.items) {
    // product se category nikal
    const p = db.products.find((x) => x.slug === it.slug);
    const cat = p?.category ?? "other";
    catRevenue[cat] = (catRevenue[cat] ?? 0) + it.price * it.qty;
  }
  const topCategories = Object.entries(catRevenue)
    .map(([slug, revenue]) => ({ slug, name: db.categories.find((c) => c.slug === slug)?.name ?? slug, revenue }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 6);

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
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Recent orders
  const recentOrders = [...db.orders]
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, 6)
    .map((o) => ({ id: o.id, name: o.name, total: o.total, status: o.status, createdAt: o.createdAt, payment: o.payment }));

  // Low stock
  const lowStock = db.products.filter((p) => !p.inStock).length;

  // Avg rating
  const avgRating = db.reviews.length
    ? (db.reviews.reduce((s, r) => s + r.rating, 0) / db.reviews.length).toFixed(1)
    : "0";

  return NextResponse.json({
    users: db.users.length,
    adminUsers: db.users.filter((u) => u.isAdmin).length,
    customers: db.users.filter((u) => !u.isAdmin).length,
    products: db.products.length,
    inStockProducts: db.products.filter((p) => p.inStock).length,
    lowStock,
    hampers: db.hampers.length,
    categories: db.categories.length,
    orders: db.orders.length,
    liveOrders: live.length,
    revenue,
    cancelledRevenue,
    avgOrderValue: live.length ? Math.round(revenue / live.length) : 0,
    byStatus,
    days,
    codCount,
    onlineCount,
    codRevenue,
    onlineRevenue,
    topProducts,
    topCustomers,
    topCategories,
    recentOrders,
    pendingContacts: db.contacts.length,
    subscribers: db.newsletter.length,
    reviews: db.reviews.length,
    avgRating,
  });
}
