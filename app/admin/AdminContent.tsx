"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { categories, inr } from "@/lib/products";
import { cn } from "@/lib/utils";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";

async function j(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

const TABS = ["Overview", "Orders", "Products", "Categories", "Gift Hampers", "Promo Banner", "Pincodes", "Coupons", "Users", "Messages", "Reviews"] as const;
type Tab = (typeof TABS)[number];

export default function AdminContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const raw = searchParams.get("tab");
  const tab: Tab = (TABS as readonly string[]).includes(raw ?? "") ? (raw as Tab) : "Overview";
  const [stats, setStats] = useState<Record<string, unknown> | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [hampers, setHampers] = useState<any[]>([]);
  const [promo, setPromo] = useState<any>(null);
  const [coupons, setCoupons] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [s, o, p, cg, hg, pg, c, u, m, n, r] = await Promise.all([
        j("/api/admin/stats"),
        j("/api/admin/orders"),
        j("/api/admin/products"),
        j("/api/admin/categories"),
        j("/api/admin/hampers"),
        j("/api/settings"),
        j("/api/admin/coupons"),
        j("/api/admin/users"),
        j("/api/admin/contacts"),
        j("/api/newsletter"),
        j("/api/admin/reviews"),
      ]);
      setStats(s);
      setOrders(o.orders);
      setProducts(p.products);
      setCats(cg.categories);
      setHampers(hg.hampers);
      setPromo(pg.settings?.promo ?? null);
      setCoupons(c.coupons);
      setUsers(u.users);
      setContacts(m.contacts);
      setSubs(n.subscribers);
      setReviews(r.reviews);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load admin data.");
    }
  }, []);

  useEffect(() => {
    if (user?.isAdmin) load();
  }, [user, load]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-gold" />
        <h1 className="mt-4 font-display text-4xl font-semibold">Login required</h1>
        <Link href="/admin/login" className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground">
          Admin Login
        </Link>
      </div>
    );
  }
  if (!user.isAdmin) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <ShieldAlert className="mx-auto h-12 w-12 text-destructive" />
        <h1 className="mt-4 font-display text-4xl font-semibold">Access denied</h1>
        <p className="mt-2 text-sm text-muted-foreground">This area is for store admins only.</p>
        <Link href="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground">
          Go home
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {tab === "Overview" && "Store performance at a glance."}
          {tab === "Orders" && "View and update customer orders."}
          {tab === "Products" && "Manage catalogue, price and stock."}
          {tab === "Categories" && "Shop-by-category tiles on the home page."}
          {tab === "Gift Hampers" && "Curated gift hampers with multiple items."}
          {tab === "Promo Banner" && "Home page offer banner with live countdown."}
          {tab === "Pincodes" && "Pincode-wise delivery charges across India."}
          {tab === "Coupons" && "Create and manage discount codes."}
          {tab === "Users" && "Customers and admin access."}
          {tab === "Messages" && "Contact messages and subscribers."}
          {tab === "Reviews" && "Moderate customer reviews."}
        </p>
        <button onClick={load} className="rounded-md border border-input bg-background px-4 py-2 text-sm hover:border-gold">
          Refresh
        </button>
      </div>
      {err && (
        <p role="alert" className="mb-4 rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">
          {err}
        </p>
      )}

      <div>
        {tab === "Overview" && stats && <Overview stats={stats} />}
        {tab === "Orders" && <OrdersTab orders={orders} reload={load} />}
        {tab === "Products" && <ProductsTab products={products} cats={cats} reload={load} />}
        {tab === "Categories" && <CategoriesTab cats={cats} reload={load} />}
        {tab === "Gift Hampers" && <HampersTab hampers={hampers} reload={load} />}
        {tab === "Promo Banner" && <PromoTab promo={promo} reload={load} />}
        {tab === "Pincodes" && <PincodesTab reload={load} />}
        {tab === "Coupons" && <CouponsTab coupons={coupons} reload={load} />}
        {tab === "Users" && <UsersTab users={users} reload={load} />}
        {tab === "Messages" && <MessagesTab contacts={contacts} subs={subs} reload={load} />}
        {tab === "Reviews" && <ReviewsTab reviews={reviews} reload={load} />}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-black/[0.06] bg-white p-5 shadow-sm">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-primary">{value}</p>
    </div>
  );
}

function Overview({ stats }: { stats: Record<string, any> }) {
  const COLORS = ["#c9a227", "#3a2e22", "#16a34a", "#dc2626"];
  const STATUS_LABEL: Record<string, string> = {
    placed: "Placed",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
  };

  return (
    <div className="space-y-6">
      {/* KPI row 1 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard label="Revenue" value={inr(stats.revenue)} sub={`${stats.liveOrders} paid orders`} tone="gold" icon="₹" />
        <KpiCard label="Orders" value={String(stats.orders)} sub={`${stats.byStatus.find((s: any) => s.status === "placed")?.count ?? 0} pending`} tone="primary" />
        <KpiCard label="Customers" value={String(stats.customers)} sub={`${stats.adminUsers} admins`} tone="primary" />
        <KpiCard label="Avg order" value={inr(stats.avgOrderValue)} sub={`Rating ${stats.avgRating}★`} tone="gold" />
      </div>

      {/* KPI row 2 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <MiniKpi label="Products" value={stats.products} sub={`${stats.inStockProducts} in stock`} />
        <MiniKpi label="Out of stock" value={stats.lowStock} sub="need restock" warn={stats.lowStock > 0} />
        <MiniKpi label="Hampers" value={stats.hampers} />
        <MiniKpi label="Categories" value={stats.categories} />
        <MiniKpi label="Reviews" value={stats.reviews} sub={`${stats.avgRating} avg`} />
        <MiniKpi label="Messages" value={stats.pendingContacts} sub={`${stats.subscribers} subs`} />
      </div>

      {/* Charts row */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue line chart (7 days) */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-primary">Revenue — last 7 days</h3>
            <span className="text-xs text-muted-foreground">₹{stats.revenue.toLocaleString("en-IN")} total</span>
          </div>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats.days} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#6b6258" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b6258" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: "1px solid #e5e0d6", fontSize: 12 }}
                  formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                />
                <Line type="monotone" dataKey="revenue" stroke="#c9a227" strokeWidth={3} dot={{ r: 4, fill: "#c9a227" }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Status pie */}
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-primary">Orders by status</h3>
          <div className="mt-2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.byStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {stats.byStatus.map((_: any, i: number) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Legend
                  verticalAlign="bottom"
                  iconType="circle"
                  formatter={(v: string) => STATUS_LABEL[v] ?? v}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Payment split + categories */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-primary">Payment methods</h3>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: "COD", orders: stats.codCount, revenue: stats.codRevenue },
                { name: "Online", orders: stats.onlineCount, revenue: stats.onlineRevenue },
              ]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#6b6258" }} />
                <YAxis tick={{ fontSize: 11, fill: "#6b6258" }} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Bar dataKey="orders" fill="#c9a227" radius={[8, 8, 0, 0]} />
                <Bar dataKey="revenue" fill="#3a2e22" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex justify-around text-xs text-muted-foreground">
            <span>COD: {stats.codCount} orders · {inr(stats.codRevenue)}</span>
            <span>Online: {stats.onlineCount} orders · {inr(stats.onlineRevenue)}</span>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-primary">Revenue by category</h3>
          <div className="mt-4 h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.topCategories} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e0d6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: "#6b6258" }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#6b6258" }} width={90} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} formatter={(v: number) => `₹${v.toLocaleString("en-IN")}`} />
                <Bar dataKey="revenue" fill="#c9a227" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top products + top customers */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-primary">Top products by revenue</h3>
          <ul className="mt-3 space-y-2">
            {stats.topProducts.map((p: any, i: number) => (
              <li key={p.slug} className="flex items-center gap-3 text-sm">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gold/15 text-xs font-bold text-primary">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate">{p.name}</span>
                <span className="text-muted-foreground">×{p.qty}</span>
                <b className="shrink-0 text-primary">{inr(p.revenue)}</b>
              </li>
            ))}
            {stats.topProducts.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No sales yet.</p>}
          </ul>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h3 className="font-display text-lg font-semibold text-primary">Top customers</h3>
          <ul className="mt-3 space-y-2">
            {stats.topCustomers.map((c: any, i: number) => (
              <li key={i} className="flex items-center gap-3 text-sm">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {c.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {c.name}
                  <span className="block truncate text-xs text-muted-foreground">{c.email}</span>
                </span>
                <span className="text-muted-foreground">{c.orders} orders</span>
                <b className="shrink-0 text-primary">{inr(c.spent)}</b>
              </li>
            ))}
            {stats.topCustomers.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">No customers yet.</p>}
          </ul>
        </div>
      </div>

      {/* Recent orders */}
      <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
        <h3 className="font-display text-lg font-semibold text-primary">Recent orders</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-2 pr-4">Order</th>
                <th className="py-2 pr-4">Customer</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4 text-right">Total</th>
                <th className="py-2 text-right">When</th>
              </tr>
            </thead>
            <tbody>
              {stats.recentOrders.map((o: any) => (
                <tr key={o.id} className="border-b border-border/50">
                  <td className="py-2.5 pr-4 font-mono text-xs">{o.id}</td>
                  <td className="py-2.5 pr-4">{o.name}</td>
                  <td className="py-2.5 pr-4 text-xs uppercase">{o.payment}</td>
                  <td className="py-2.5 pr-4">
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", o.status === "delivered" ? "bg-green-100 text-green-700" : o.status === "cancelled" ? "bg-red-100 text-red-700" : "bg-gold/20 text-cocoa")}>
                      {o.status}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 text-right font-semibold text-primary">{inr(o.total)}</td>
                  <td className="py-2.5 text-right text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</td>
                </tr>
              ))}
              {stats.recentOrders.length === 0 && (
                <tr><td colSpan={6} className="py-8 text-center text-sm text-muted-foreground">No orders yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, tone, icon }: { label: string; value: string; sub?: string; tone?: "gold" | "primary"; icon?: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm">
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10" style={{ backgroundColor: tone === "gold" ? "#c9a227" : "#3a2e22" }} />
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-semibold text-primary">
        {icon && <span className="mr-1 text-gold">{icon}</span>}
        {value}
      </p>
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function MiniKpi({ label, value, sub, warn }: { label: string; value: number; sub?: string; warn?: boolean }) {
  return (
    <div className={cn("rounded-xl border bg-card p-4 shadow-sm", warn ? "border-destructive/40" : "border-border")}>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl font-semibold", warn ? "text-destructive" : "text-primary")}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function OrdersTab({ orders, reload }: { orders: any[]; reload: () => void }) {
  const [q, setQ] = useState("");
  const [st, setSt] = useState("");
  const list = orders.filter(
    (o) =>
      (!st || o.status === st) &&
      (!q || `${o.id} ${o.name} ${o.email} ${o.phone}`.toLowerCase().includes(q.toLowerCase())),
  );
  const setStatus = async (id: string, status: string) => {
    await j(`/api/admin/orders/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    reload();
  };
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search id, name, phone…" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <select value={st} onChange={(e) => setSt(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All statuses</option>
          {["placed", "shipped", "delivered", "cancelled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <ul className="mt-4 space-y-3">
        {list.map((o) => (
          <li key={o.id} className="rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono font-semibold">{o.id}</span>
              <select value={o.status} onChange={(e) => setStatus(o.id, e.target.value)} className="rounded-md border border-input bg-background px-2 py-1 text-xs">
                {["placed", "shipped", "delivered", "cancelled"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-muted-foreground">
              {o.name} · {o.phone} · {o.city} {o.pin} · {new Date(o.createdAt).toLocaleString("en-IN")}
            </p>
            <p className="mt-1">
              {o.items.map((it: any) => `${it.name} (${it.variant} × ${it.qty})`).join(", ")}
            </p>
            <p className="mt-1 font-semibold text-primary">Total {inr(o.total)} {o.coupon && <span className="text-xs font-normal text-muted-foreground">({o.coupon})</span>}</p>
          </li>
        ))}
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No orders found.</p>}
      </ul>
    </div>
  );
}

type VariantForm = { label: string; price: string; mrp: string };
type ProductForm = {
  slug: string;
  name: string;
  category: string;
  group: string;
  image: string;
  rating: string;
  badge: string;
  inStock: boolean;
  description: string;
  highlights: string[];
  variants: VariantForm[];
  metaTitle: string;
  metaDescription: string;
};

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

const blankForm = (): ProductForm => ({
  slug: "",
  name: "",
  category: categories[0]?.slug ?? "almonds",
  group: "dry-fruits",
  image: "/images/mixed.jpg",
  rating: "4.5",
  badge: "",
  inStock: true,
  description: "",
  highlights: [""],
  variants: [{ label: "250 g", price: "", mrp: "" }],
  metaTitle: "",
  metaDescription: "",
});

const fromProduct = (p: any): ProductForm => ({
  slug: p.slug,
  name: p.name,
  category: p.category,
  group: p.group,
  image: p.image,
  rating: String(p.rating ?? 4.5),
  badge: p.badge ?? "",
  inStock: p.inStock !== false,
  description: p.description ?? "",
  highlights: p.highlights?.length ? [...p.highlights] : [""],
  variants: p.variants?.length
    ? p.variants.map((v: any) => ({ label: v.label, price: String(v.price), mrp: String(v.mrp) }))
    : [{ label: "250 g", price: "", mrp: "" }],
  metaTitle: p.metaTitle ?? "",
  metaDescription: p.metaDescription ?? "",
});

function ProductsTab({ products, cats, reload }: { products: any[]; cats: any[]; reload: () => void }) {
  const [editor, setEditor] = useState<{ isNew: boolean; slugTouched: boolean; form: ProductForm } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const catList = cats.length ? cats : categories;

  const list = products.filter(
    (p) => !q || `${p.name} ${p.slug} ${p.category}`.toLowerCase().includes(q.toLowerCase()),
  );

  const openNew = () => {
    setErr(null);
    const form = blankForm();
    if (catList.length && !catList.some((c: any) => c.slug === form.category)) {
      form.category = catList[0].slug;
    }
    setEditor({ isNew: true, slugTouched: false, form });
  };
  const openEdit = (p: any) => {
    setErr(null);
    setEditor({ isNew: false, slugTouched: true, form: fromProduct(p) });
  };

  const set = (patch: Partial<ProductForm>) =>
    setEditor((e) => (e ? { ...e, form: { ...e.form, ...patch } } : e));

  const setName = (name: string) =>
    setEditor((e) => {
      if (!e) return e;
      const form = { ...e.form, name };
      // Slug naam se auto-banta hai jab tak khud edit na kiya ho
      if (e.isNew && !e.slugTouched) form.slug = slugify(name);
      return { ...e, form };
    });

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editor) return;
    const { form, isNew } = editor;
    const variants = form.variants
      .map((v) => ({ label: v.label.trim(), price: Math.floor(Number(v.price)), mrp: Math.floor(Number(v.mrp)) }))
      .filter((v) => v.label && v.price > 0 && v.mrp > 0);
    if (form.name.trim().length < 3) return setErr("Product name must be at least 3 characters.");
    if (!slugify(form.slug)) return setErr("Slug is required (e.g. roasted-almonds).");
    if (form.description.trim().length < 10) return setErr("Description must be at least 10 characters.");
    if (variants.length === 0) return setErr("Add at least one pack size with price and MRP.");

    setBusy(true);
    setErr(null);
    try {
      await j("/api/admin/products", {
        method: isNew ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: slugify(form.slug),
          name: form.name.trim(),
          category: form.category,
          group: form.group,
          image: form.image.trim() || "/images/mixed.jpg",
          rating: Math.min(5, Math.max(0, Number(form.rating) || 0)),
          badge: form.badge || undefined,
          inStock: form.inStock,
          description: form.description.trim(),
          highlights: form.highlights.map((h) => h.trim()).filter(Boolean),
          variants,
          metaTitle: form.metaTitle.trim(),
          metaDescription: form.metaDescription.trim(),
        }),
      });
      setEditor(null);
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save product.");
    } finally {
      setBusy(false);
    }
  };

  const toggleStock = async (p: any) => {
    await j("/api/admin/products", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, inStock: !p.inStock }),
    });
    reload();
  };
  const remove = async (slug: string) => {
    if (!confirm(`Delete ${slug}? This cannot be undone.`)) return;
    await j(`/api/admin/products?slug=${slug}`, { method: "DELETE" });
    reload();
  };

  const F = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold";
  const L = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search products…" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={openNew} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-cocoa">
          + Add product
        </button>
      </div>

      {editor && (
        <form onSubmit={save} className="space-y-5 rounded-xl border border-gold/40 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{editor.isNew ? "New product" : `Edit — ${editor.form.name}`}</h3>
            <button type="button" onClick={() => setEditor(null)} className="text-sm text-muted-foreground hover:text-foreground">
              Close ✕
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              <span className={L}>Product name *</span>
              <input value={editor.form.name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Roasted Salted Almonds" className={`${F} mt-1.5`} />
            </label>
            <label className="text-sm font-medium">
              <span className={L}>Slug (URL) *</span>
              <input
                value={editor.form.slug}
                onChange={(e) => setEditor((ed) => (ed ? { ...ed, slugTouched: true, form: { ...ed.form, slug: e.target.value } } : ed))}
                required
                placeholder="roasted-salted-almonds"
                className={`${F} mt-1.5 font-mono`}
              />
            </label>
            <label className="text-sm font-medium">
              <span className={L}>Category</span>
              <select value={editor.form.category} onChange={(e) => set({ category: e.target.value })} className={`${F} mt-1.5`}>
                {catList.map((c: any) => (
                  <option key={c.slug} value={c.slug}>{c.name}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              <span className={L}>Collection</span>
              <select value={editor.form.group} onChange={(e) => set({ group: e.target.value })} className={`${F} mt-1.5`}>
                {[
                  ["dry-fruits", "Dry Fruits"],
                  ["nuts-seeds", "Nuts & Seeds"],
                  ["dates-figs", "Dates & Figs"],
                  ["gift-hampers", "Gift Hampers"],
                ].map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              <span className={L}>Image URL</span>
              <span className="mt-1.5 flex items-center gap-3">
                <img
                  src={editor.form.image || "/images/mixed.jpg"}
                  alt=""
                  onError={(e) => ((e.target as HTMLImageElement).src = "/images/mixed.jpg")}
                  className="h-14 w-14 shrink-0 rounded-md border border-border object-cover"
                />
                <input value={editor.form.image} onChange={(e) => set({ image: e.target.value })} placeholder="/images/almonds.jpg" className={`${F} font-mono`} />
              </span>
            </label>
            <label className="text-sm font-medium">
              <span className={L}>Rating (0–5)</span>
              <input value={editor.form.rating} onChange={(e) => set({ rating: e.target.value })} type="number" min={0} max={5} step={0.1} className={`${F} mt-1.5`} />
            </label>
            <label className="text-sm font-medium">
              <span className={L}>Badge</span>
              <select value={editor.form.badge} onChange={(e) => set({ badge: e.target.value })} className={`${F} mt-1.5`}>
                <option value="">None</option>
                <option value="Best Seller">Best Seller</option>
                <option value="New Arrival">New Arrival</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
              <input type="checkbox" checked={editor.form.inStock} onChange={(e) => set({ inStock: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
              In stock (uncheck = Sold out)
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              <span className={L}>Description *</span>
              <textarea value={editor.form.description} onChange={(e) => set({ description: e.target.value })} required rows={3} placeholder="Taste, quality, best uses…" className={`${F} mt-1.5 resize-y`} />
            </label>
          </div>

          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <p className={L}>SEO — Google me kaise dikhega</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium">
                <span className="flex items-center justify-between text-xs text-muted-foreground">
                  Meta title
                  <span className={cn(editor.form.metaTitle.trim().length > 60 && "font-semibold text-destructive")}>
                    {editor.form.metaTitle.trim().length}/60
                  </span>
                </span>
                <input value={editor.form.metaTitle} onChange={(e) => set({ metaTitle: e.target.value })} maxLength={120} placeholder="Khali = auto (product name + Buy Online)" className={`${F} mt-1.5`} />
              </label>
              <label className="text-sm font-medium">
                <span className="flex items-center justify-between text-xs text-muted-foreground">
                  Meta description
                  <span className={cn(editor.form.metaDescription.trim().length > 160 && "font-semibold text-destructive")}>
                    {editor.form.metaDescription.trim().length}/160
                  </span>
                </span>
                <textarea value={editor.form.metaDescription} onChange={(e) => set({ metaDescription: e.target.value })} maxLength={320} rows={3} placeholder="Khali = auto (description + rating + price)" className={`${F} mt-1.5 resize-y`} />
              </label>
            </div>
            <div className="mt-3 rounded-lg border border-border bg-white p-3">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Google preview</p>
              <p className="mt-1 truncate text-[13px] text-[#202124]">
                dryfruitadda.in <span className="text-muted-foreground">› product › {editor.form.slug || "…"}</span>
              </p>
              <p className="truncate text-lg text-[#1a0dab] hover:underline">
                {(editor.form.metaTitle.trim() || `${editor.form.name || "Product name"} — Buy Online`) + " | Dryfruit Adda"}
              </p>
              <p className="line-clamp-2 text-[13px] text-[#4d5156]">
                {editor.form.metaDescription.trim() || editor.form.description || "Meta description yahan dikhegi…"}
              </p>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Khali chhodne par title/description automatically ban jaate hain. 60/160 characters se zyada Google kaat deta hai.
            </p>
          </div>

          <div>
            <p className={L}>Highlights</p>
            <div className="mt-1.5 space-y-2">
              {editor.form.highlights.map((h, i) => (
                <span key={i} className="flex gap-2">
                  <input value={h} onChange={(e) => set({ highlights: editor.form.highlights.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={`Highlight ${i + 1} (e.g. Hand-sorted kernels)`} className={F} />
                  <button type="button" onClick={() => set({ highlights: editor.form.highlights.filter((_, j) => j !== i) })} aria-label="Remove highlight" className="shrink-0 rounded-md border border-input px-3 text-destructive hover:border-destructive">
                    −
                  </button>
                </span>
              ))}
              <button type="button" onClick={() => set({ highlights: [...editor.form.highlights, ""] })} className="text-sm font-medium text-primary hover:underline">
                + Add highlight
              </button>
            </div>
          </div>

          <div>
            <p className={L}>Pack sizes & prices *</p>
            <div className="mt-1.5 space-y-2">
              {editor.form.variants.map((v, i) => {
                const price = Number(v.price) || 0;
                const mrp = Number(v.mrp) || 0;
                const off = mrp > price && price > 0 ? Math.round((1 - price / mrp) * 100) : 0;
                return (
                  <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] items-center gap-2">
                    <input value={v.label} onChange={(e) => set({ variants: editor.form.variants.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} placeholder="250 g" aria-label="Pack size" className={F} />
                    <input value={v.price} onChange={(e) => set({ variants: editor.form.variants.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)) })} inputMode="numeric" placeholder="₹ Price" aria-label="Price" className={F} />
                    <input value={v.mrp} onChange={(e) => set({ variants: editor.form.variants.map((x, j) => (j === i ? { ...x, mrp: e.target.value } : x)) })} inputMode="numeric" placeholder="₹ MRP" aria-label="MRP" className={F} />
                    <span className="flex items-center gap-1">
                      {off > 0 && <span className="hidden rounded bg-gold/20 px-1.5 py-0.5 text-[11px] font-semibold sm:block">−{off}%</span>}
                      <button type="button" onClick={() => set({ variants: editor.form.variants.filter((_, j) => j !== i) })} disabled={editor.form.variants.length <= 1} aria-label="Remove variant" className="rounded-md border border-input px-2.5 py-2 text-destructive hover:border-destructive disabled:opacity-30">
                        −
                      </button>
                    </span>
                  </div>
                );
              })}
              <button type="button" onClick={() => set({ variants: [...editor.form.variants, { label: "", price: "", mrp: "" }] })} className="text-sm font-medium text-primary hover:underline">
                + Add pack size
              </button>
            </div>
          </div>

          {err && (
            <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">
              {err}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-60">
              {busy ? "Saving…" : editor.isNew ? "Create product" : "Save changes"}
            </button>
            <button type="button" onClick={() => setEditor(null)} className="rounded-md border border-input px-5 py-2.5 text-sm">
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {list.map((p) => (
          <li key={p.slug} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <img src={p.image} alt="" loading="lazy" className="h-10 w-10 rounded-md border border-border object-cover" />
            <span className="min-w-0 flex-1">
              <b>{p.name}</b>
              <span className="block truncate text-xs text-muted-foreground">
                {p.slug} · {p.category} · {p.variants?.map((v: any) => `${v.label} ₹${v.price}`).join(" / ")}
              </span>
            </span>
            <button onClick={() => toggleStock(p)} className={cn("rounded-full px-3 py-1 text-xs font-medium", p.inStock ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>
              {p.inStock ? "In stock" : "Out of stock"}
            </button>
            <button onClick={() => openEdit(p)} className="rounded-md border border-input px-3 py-1 text-xs hover:border-gold">Edit</button>
            <button onClick={() => remove(p.slug)} className="text-xs text-destructive hover:underline">Delete</button>
          </li>
        ))}
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No products found.</p>}
      </ul>
    </div>
  );
}

function CategoriesTab({ cats, reload }: { cats: any[]; reload: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [image, setImage] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const F = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold";

  const reset = () => {
    setName("");
    setSlug("");
    setSlugTouched(false);
    setImage("");
    setEditing(null);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      if (editing) {
        await j("/api/admin/categories", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: editing.slug, name, image }),
        });
      } else {
        await j("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, slug: slug || undefined, image: image || undefined }),
        });
      }
      reset();
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save category.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c: any) => {
    if (!confirm(`Delete category "${c.name}"?`)) return;
    setErr(null);
    try {
      await j(`/api/admin/categories?slug=${c.slug}`, { method: "DELETE" });
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't delete category.");
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={save} className="space-y-3 rounded-xl border border-gold/40 bg-card p-5">
        <h3 className="font-semibold">{editing ? `Edit — ${editing.name}` : "Add category"}</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Name *</span>
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!editing && !slugTouched) {
                  setSlug(e.target.value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""));
                }
              }}
              required
              placeholder="e.g. Exotic Nuts"
              className={`${F} mt-1.5`}
            />
          </label>
          <label className="text-sm font-medium">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Slug {!editing && "(auto)"}</span>
            <input
              value={editing ? editing.slug : slug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(e.target.value);
              }}
              disabled={!!editing}
              placeholder="exotic-nuts"
              className={`${F} mt-1.5 font-mono disabled:opacity-60`}
            />
          </label>
          <label className="text-sm font-medium">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">Image URL</span>
            <input value={image} onChange={(e) => setImage(e.target.value)} placeholder="/images/mixed.jpg" className={`${F} mt-1.5 font-mono`} />
          </label>
        </div>
        {(image || editing?.image) && (
          <img
            src={image || editing.image}
            alt=""
            onError={(e) => ((e.target as HTMLImageElement).src = "/images/mixed.jpg")}
            className="h-16 w-16 rounded-lg border border-border object-cover"
          />
        )}
        {err && (
          <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">
            {err}
          </p>
        )}
        <div className="flex gap-2">
          <button disabled={busy} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-60">
            {busy ? "Saving…" : editing ? "Save changes" : "Add category"}
          </button>
          {(editing || name || image) && (
            <button type="button" onClick={reset} className="rounded-md border border-input px-4 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      <ul className="grid gap-2 sm:grid-cols-2">
        {cats.map((c) => (
          <li key={c.slug} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-sm">
            <img src={c.image} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).src = "/images/mixed.jpg")} className="h-11 w-11 rounded-lg border border-border object-cover" />
            <span className="min-w-0 flex-1">
              <b>{c.name}</b>
              <span className="block truncate font-mono text-xs text-muted-foreground">
                {c.slug} · {c.products ?? 0} products
              </span>
            </span>
            <button
              onClick={() => {
                setEditing(c);
                setName(c.name);
                setImage(c.image);
                setErr(null);
              }}
              className="rounded-md border border-input px-3 py-1 text-xs hover:border-gold"
            >
              Edit
            </button>
            <button onClick={() => remove(c)} className="text-xs text-destructive hover:underline">
              Delete
            </button>
          </li>
        ))}
        {cats.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground sm:col-span-2">No categories.</p>}
      </ul>
      <p className="text-xs text-muted-foreground">
        Kisi category me products hon to wo delete nahi hogi — pehle products ko doosri category me move karo.
      </p>
    </div>
  );
}

function CouponsTab({ coupons, reload }: { coupons: any[]; reload: () => void }) {
  const [form, setForm] = useState({ code: "", pct: "10", min: "499", expiresAt: "" });
  const H = { "Content-Type": "application/json" };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await j("/api/admin/coupons", {
      method: "POST",
      headers: H,
      body: JSON.stringify({
        ...form,
        pct: Number(form.pct),
        min: Number(form.min),
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : undefined,
      }),
    });
    setForm({ code: "", pct: "10", min: "499", expiresAt: "" });
    reload();
  };
  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap items-end gap-2">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="CODE" className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase" />
        <input value={form.pct} onChange={(e) => setForm({ ...form, pct: e.target.value })} required type="number" min={1} max={90} placeholder="% off" className="w-20 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} required type="number" min={0} placeholder="Min ₹" className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <label className="text-xs text-muted-foreground">
          Expiry
          <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className="mt-1 block w-44 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        </label>
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Add coupon</button>
      </form>
      <ul className="space-y-2">
        {coupons.map((c) => {
          const expired = c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
          return (
            <li key={c.code} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
              <b className="font-mono">{c.code}</b>
              <span className="text-muted-foreground">{c.pct}% off above {inr(c.min)}</span>
              {c.expiresAt && (
                <span className={cn("rounded-full px-2.5 py-0.5 text-[11px] font-medium", expired ? "bg-destructive/10 text-destructive" : "bg-gold/15 text-cocoa")}>
                  {expired ? "Expired" : `Expires ${new Date(c.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                </span>
              )}
              <span className="flex-1" />
              <button
                onClick={async () => { await j("/api/admin/coupons", { method: "PUT", headers: H, body: JSON.stringify({ code: c.code, active: !c.active }) }); reload(); }}
                className={cn("rounded-full px-3 py-1 text-xs font-medium", c.active ? "bg-primary/10 text-primary" : "bg-border text-muted-foreground")}
              >
                {c.active ? "Active" : "Disabled"}
              </button>
              <button
                onClick={async () => { if (confirm(`Delete ${c.code}?`)) { await j(`/api/admin/coupons?code=${c.code}`, { method: "DELETE" }); reload(); } }}
                className="text-xs text-destructive hover:underline"
              >
                Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UsersTab({ users, reload }: { users: any[]; reload: () => void }) {
  return (
    <ul className="space-y-2">
      {users.map((u) => (
        <li key={u.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
          <span className="min-w-0 flex-1">
            <b>{u.name}</b> <span className="text-muted-foreground">{u.email} · {u.orders} orders</span>
          </span>
          {u.isAdmin ? (
            <span className="rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold text-cocoa">Admin</span>
          ) : (
            <button
              onClick={async () => { await j("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: u.id, isAdmin: true }) }); reload(); }}
              className="rounded-full border border-input px-3 py-1 text-xs hover:border-gold"
            >
              Make admin
            </button>
          )}
          {!u.isAdmin && (
            <button
              onClick={async () => {
                if (!confirm(`Delete user ${u.name} (${u.email})? This will also remove their orders, cart, wishlist, addresses and reviews.`)) return;
                try { await j(`/api/admin/users?id=${u.id}`, { method: "DELETE" }); reload(); }
                catch (e) { alert(e instanceof Error ? e.message : "Couldn't delete user."); }
              }}
              className="text-xs text-destructive hover:underline"
            >
              Delete
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

function MessagesTab({ contacts, subs, reload }: { contacts: any[]; subs: any[]; reload: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="font-semibold">Contact messages ({contacts.length})</h3>
        <ul className="mt-3 space-y-2">
          {contacts.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-card p-3 text-sm">
              <p><b>{c.name}</b> <span className="text-muted-foreground">{c.email}{c.phone ? ` · ${c.phone}` : ""}</span></p>
              <p className="mt-1 text-muted-foreground">{c.message}</p>
              <button
                onClick={async () => { await j(`/api/admin/contacts?id=${c.id}`, { method: "DELETE" }); reload(); }}
                className="mt-1 text-xs text-destructive hover:underline"
              >
                Delete
              </button>
            </li>
          ))}
          {contacts.length === 0 && <p className="text-sm text-muted-foreground">No messages.</p>}
        </ul>
      </div>
      <div>
        <h3 className="font-semibold">Newsletter subscribers ({subs.length})</h3>
        <ul className="mt-3 space-y-1.5 text-sm">
          {subs.map((s) => (
            <li key={s.email} className="flex justify-between rounded-lg border border-border bg-card px-3 py-2">
              <span>{s.email}</span>
              <span className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString("en-IN")}</span>
            </li>
          ))}
          {subs.length === 0 && <p className="text-sm text-muted-foreground">No subscribers yet.</p>}
        </ul>
      </div>
    </div>
  );
}

function ReviewsTab({ reviews, reload }: { reviews: any[]; reload: () => void }) {
  return (
    <ul className="space-y-2">
      {reviews.map((r) => (
        <li key={r.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
          <span className="min-w-0 flex-1">
            <b>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</b> {r.title || r.comment.slice(0, 80)}
            <span className="block text-xs text-muted-foreground">{r.userName} · {r.productSlug}</span>
          </span>
          <button
            onClick={async () => { if (confirm("Delete this review?")) { await j(`/api/admin/reviews?id=${r.id}`, { method: "DELETE" }); reload(); } }}
            className="text-xs text-destructive hover:underline"
          >
            Delete
          </button>
        </li>
      ))}
      {reviews.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No reviews.</p>}
    </ul>
  );
}
function HampersTab({ hampers, reload }: { hampers: any[]; reload: () => void }) {
  const [editor, setEditor] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const list = hampers.filter((h) => !q || `${h.name} ${h.slug}`.toLowerCase().includes(q.toLowerCase()));

  const blank = { slug: "", name: "", image: "/images/gift.jpg", description: "", highlights: [""], price: "", mrp: "", rating: "4.9", badge: "", inStock: true, items: [{ slug: "", name: "", qty: "1" }], metaTitle: "", metaDescription: "" };

  const openNew = () => { setErr(null); setEditor({ isNew: true, slugTouched: false, form: { ...blank } }); };
  const openEdit = (h: any) => {
    setErr(null);
    setEditor({ isNew: false, slugTouched: true, form: {
      slug: h.slug, name: h.name, image: h.image, description: h.description,
      highlights: h.highlights?.length ? [...h.highlights] : [""],
      price: String(h.price), mrp: String(h.mrp), rating: String(h.rating ?? 4.9),
      badge: h.badge ?? "", inStock: h.inStock !== false,
      items: h.items?.length ? h.items.map((it: any) => ({ slug: it.slug, name: it.name, qty: String(it.qty) })) : [{ slug: "", name: "", qty: "1" }],
      metaTitle: h.metaTitle ?? "", metaDescription: h.metaDescription ?? "",
    }});
  };

  const set = (patch: Record<string, unknown>) => setEditor((e: any) => (e ? { ...e, form: { ...e.form, ...patch } } : e));
  const setName = (name: string) => setEditor((e: any) => {
    if (!e) return e;
    const form = { ...e.form, name };
    if (e.isNew && !e.slugTouched) form.slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    return { ...e, form };
  });

  const save = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!editor) return;
    const f = editor.form;
    const items = f.items.map((it: any) => ({ slug: it.slug.trim(), name: it.name.trim(), qty: Math.max(1, Number(it.qty) || 1) })).filter((it: any) => it.slug && it.name);
    if (f.name.trim().length < 3) return setErr("Hamper name must be at least 3 characters.");
    if (!f.slug.trim()) return setErr("Slug is required.");
    if (f.description.trim().length < 10) return setErr("Description must be at least 10 characters.");
    if (!f.price || !f.mrp) return setErr("Price and MRP are required.");
    if (Number(f.mrp) < Number(f.price)) return setErr("MRP must be >= price.");
    if (items.length === 0) return setErr("Add at least one item to the hamper.");
    setBusy(true); setErr(null);
    try {
      await j("/api/admin/hampers", { method: editor.isNew ? "POST" : "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: f.slug.trim(), name: f.name.trim(), image: f.image.trim() || "/images/gift.jpg", description: f.description.trim(),
          highlights: f.highlights.map((h: string) => h.trim()).filter(Boolean), price: Number(f.price), mrp: Number(f.mrp),
          rating: Number(f.rating) || 4.9, badge: f.badge || undefined, inStock: f.inStock, items,
          metaTitle: f.metaTitle.trim(), metaDescription: f.metaDescription.trim() }) });
      setEditor(null); reload();
    } catch (e) { setErr(e instanceof Error ? e.message : "Couldn't save hamper."); }
    finally { setBusy(false); }
  };

  const toggleStock = async (h: any) => { await j("/api/admin/hampers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...h, inStock: !h.inStock }) }); reload(); };
  const remove = async (slug: string) => { if (!confirm(`Delete hamper ${slug}?`)) return; await j(`/api/admin/hampers?slug=${slug}`, { method: "DELETE" }); reload(); };

  const F = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold";
  const L = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search hampers…" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button onClick={openNew} className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-cocoa">+ Add hamper</button>
      </div>

      {editor && (
        <form onSubmit={save} className="space-y-5 rounded-xl border border-gold/40 bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">{editor.isNew ? "New gift hamper" : `Edit — ${editor.form.name}`}</h3>
            <button type="button" onClick={() => setEditor(null)} className="text-sm text-muted-foreground hover:text-foreground">Close ✕</button>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium"><span className={L}>Hamper name *</span><input value={editor.form.name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Festive Gold Hamper" className={`${F} mt-1.5`} /></label>
            <label className="text-sm font-medium"><span className={L}>Slug (URL) *</span><input value={editor.form.slug} onChange={(e) => setEditor((ed: any) => (ed ? { ...ed, slugTouched: true, form: { ...ed.form, slug: e.target.value } } : ed))} required placeholder="festive-gold-hamper" className={`${F} mt-1.5 font-mono`} /></label>
            <label className="text-sm font-medium sm:col-span-2"><span className={L}>Image URL</span><span className="mt-1.5 flex items-center gap-3"><img src={editor.form.image || "/images/gift.jpg"} alt="" onError={(e) => ((e.target as HTMLImageElement).src = "/images/gift.jpg")} className="h-14 w-14 shrink-0 rounded-md border border-border object-cover" /><input value={editor.form.image} onChange={(e) => set({ image: e.target.value })} placeholder="/images/gift.jpg" className={`${F} font-mono`} /></span></label>
            <label className="text-sm font-medium"><span className={L}>Price (₹) *</span><input value={editor.form.price} onChange={(e) => set({ price: e.target.value })} inputMode="numeric" required placeholder="1499" className={`${F} mt-1.5`} /></label>
            <label className="text-sm font-medium"><span className={L}>MRP (₹) *</span><input value={editor.form.mrp} onChange={(e) => set({ mrp: e.target.value })} inputMode="numeric" required placeholder="1799" className={`${F} mt-1.5`} /></label>
            <label className="text-sm font-medium"><span className={L}>Rating (0–5)</span><input value={editor.form.rating} onChange={(e) => set({ rating: e.target.value })} type="number" min={0} max={5} step={0.1} className={`${F} mt-1.5`} /></label>
            <label className="text-sm font-medium"><span className={L}>Badge</span><select value={editor.form.badge} onChange={(e) => set({ badge: e.target.value })} className={`${F} mt-1.5`}><option value="">None</option><option value="Best Seller">Best Seller</option><option value="New Arrival">New Arrival</option></select></label>
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2"><input type="checkbox" checked={editor.form.inStock} onChange={(e) => set({ inStock: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />In stock (uncheck = Sold out)</label>
            <label className="text-sm font-medium sm:col-span-2"><span className={L}>Description *</span><textarea value={editor.form.description} onChange={(e) => set({ description: e.target.value })} required rows={3} placeholder="What's inside, who it's for…" className={`${F} mt-1.5 resize-y`} /></label>
          </div>

          <div>
            <p className={L}>Highlights</p>
            <div className="mt-1.5 space-y-2">
              {editor.form.highlights.map((h: string, i: number) => (
                <span key={i} className="flex gap-2">
                  <input value={h} onChange={(e) => set({ highlights: editor.form.highlights.map((x: string, j: number) => (j === i ? e.target.value : x)) })} placeholder={`Highlight ${i + 1}`} className={F} />
                  <button type="button" onClick={() => set({ highlights: editor.form.highlights.filter((_: string, j: number) => j !== i) })} aria-label="Remove highlight" className="shrink-0 rounded-md border border-input px-3 text-destructive hover:border-destructive">−</button>
                </span>
              ))}
              <button type="button" onClick={() => set({ highlights: [...editor.form.highlights, ""] })} className="text-sm font-medium text-primary hover:underline">+ Add highlight</button>
            </div>
          </div>

          <div>
            <p className={L}>Items inside the hamper *</p>
            <div className="mt-1.5 space-y-2">
              {editor.form.items.map((it: any, i: number) => (
                <div key={i} className="grid grid-cols-[1fr_1fr_70px_auto] items-center gap-2">
                  <input value={it.slug} onChange={(e) => set({ items: editor.form.items.map((x: any, j: number) => (j === i ? { ...x, slug: e.target.value } : x)) })} placeholder="product slug" aria-label="Item slug" className={`${F} font-mono`} />
                  <input value={it.name} onChange={(e) => set({ items: editor.form.items.map((x: any, j: number) => (j === i ? { ...x, name: e.target.value } : x)) })} placeholder="Display name" aria-label="Item name" className={F} />
                  <input value={it.qty} onChange={(e) => set({ items: editor.form.items.map((x: any, j: number) => (j === i ? { ...x, qty: e.target.value } : x)) })} inputMode="numeric" placeholder="Qty" aria-label="Qty" className={F} />
                  <button type="button" onClick={() => set({ items: editor.form.items.filter((_: any, j: number) => j !== i) })} disabled={editor.form.items.length <= 1} aria-label="Remove item" className="rounded-md border border-input px-2.5 py-2 text-destructive hover:border-destructive disabled:opacity-30">−</button>
                </div>
              ))}
              <button type="button" onClick={() => set({ items: [...editor.form.items, { slug: "", name: "", qty: "1" }] })} className="text-sm font-medium text-primary hover:underline">+ Add item</button>
            </div>
          </div>

          <div className="rounded-lg border border-border bg-secondary/50 p-4">
            <p className={L}>SEO — Google me kaise dikhega</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium"><span className="flex items-center justify-between text-xs text-muted-foreground">Meta title<span className={cn(editor.form.metaTitle.trim().length > 60 && "font-semibold text-destructive")}>{editor.form.metaTitle.trim().length}/60</span></span><input value={editor.form.metaTitle} onChange={(e) => set({ metaTitle: e.target.value })} maxLength={120} placeholder="Khali = auto" className={`${F} mt-1.5`} /></label>
              <label className="text-sm font-medium"><span className="flex items-center justify-between text-xs text-muted-foreground">Meta description<span className={cn(editor.form.metaDescription.trim().length > 160 && "font-semibold text-destructive")}>{editor.form.metaDescription.trim().length}/160</span></span><textarea value={editor.form.metaDescription} onChange={(e) => set({ metaDescription: e.target.value })} maxLength={320} rows={3} placeholder="Khali = auto" className={`${F} mt-1.5 resize-y`} /></label>
            </div>
          </div>

          {err && <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">{err}</p>}
          <div className="flex flex-wrap gap-2">
            <button disabled={busy} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-60">{busy ? "Saving…" : editor.isNew ? "Create hamper" : "Save changes"}</button>
            <button type="button" onClick={() => setEditor(null)} className="rounded-md border border-input px-5 py-2.5 text-sm">Cancel</button>
          </div>
        </form>
      )}

      <ul className="space-y-2">
        {list.map((h) => (
          <li key={h.slug} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <img src={h.image} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).src = "/images/gift.jpg")} className="h-10 w-10 rounded-md border border-border object-cover" />
            <span className="min-w-0 flex-1"><b>{h.name}</b><span className="block truncate text-xs text-muted-foreground">{h.slug} · ₹{h.price} (MRP ₹{h.mrp}) · {h.items?.length ?? 0} items</span></span>
            <button onClick={() => toggleStock(h)} className={cn("rounded-full px-3 py-1 text-xs font-medium", h.inStock ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive")}>{h.inStock ? "In stock" : "Out of stock"}</button>
            <button onClick={() => openEdit(h)} className="rounded-md border border-input px-3 py-1 text-xs hover:border-gold">Edit</button>
            <button onClick={() => remove(h.slug)} className="text-xs text-destructive hover:underline">Delete</button>
          </li>
        ))}
        {list.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">No hampers found.</p>}
      </ul>
    </div>
  );
}

function PromoTab({ promo, reload }: { promo: any; reload: () => void }) {
  const [form, setForm] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (promo && !form) {
      setForm({
        enabled: promo.enabled ?? true,
        title: promo.title ?? "",
        subtitle: promo.subtitle ?? "",
        couponCode: promo.couponCode ?? "",
        expiresAt: promo.expiresAt ? promo.expiresAt.slice(0, 16) : "",
        ctaLabel: promo.ctaLabel ?? "Shop Now",
        ctaHref: promo.ctaHref ?? "/shop",
        bgColor: promo.bgColor ?? "#3a2e22",
      });
    }
  }, [promo, form]);

  if (!form) return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      await j("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promo: {
            enabled: form.enabled,
            title: form.title,
            subtitle: form.subtitle,
            couponCode: form.couponCode,
            expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : promo.expiresAt,
            ctaLabel: form.ctaLabel,
            ctaHref: form.ctaHref,
            bgColor: form.bgColor,
          },
        }),
      });
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  };

  const F = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold";

  return (
    <form onSubmit={save} className="space-y-5 rounded-xl border border-gold/40 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Promo Banner (Home page)</h3>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={form.enabled} onChange={(e) => setForm({ ...form, enabled: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" />
          Enabled
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Title</span>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Special Offers on Premium Gift Boxes" className={`${F} mt-1.5`} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Subtitle</span>
          <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="Free Shipping on Orders Above ₹999" className={`${F} mt-1.5`} />
        </label>
        <label className="text-sm font-medium">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Coupon code</span>
          <input value={form.couponCode} onChange={(e) => setForm({ ...form, couponCode: e.target.value.toUpperCase() })} placeholder="WELCOME10" className={`${F} mt-1.5 font-mono uppercase`} />
        </label>
        <label className="text-sm font-medium">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Expiry (live countdown)</span>
          <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} className={`${F} mt-1.5`} />
        </label>
        <label className="text-sm font-medium">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">CTA label</span>
          <input value={form.ctaLabel} onChange={(e) => setForm({ ...form, ctaLabel: e.target.value })} placeholder="Shop Gift Hampers" className={`${F} mt-1.5`} />
        </label>
        <label className="text-sm font-medium">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">CTA link</span>
          <input value={form.ctaHref} onChange={(e) => setForm({ ...form, ctaHref: e.target.value })} placeholder="/shop?group=gift-hampers" className={`${F} mt-1.5 font-mono`} />
        </label>
        <label className="text-sm font-medium">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">Background color</span>
          <span className="mt-1.5 flex items-center gap-2">
            <input type="color" value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background" />
            <input value={form.bgColor} onChange={(e) => setForm({ ...form, bgColor: e.target.value })} className={`${F} font-mono`} />
          </span>
        </label>
      </div>

      {err && <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">{err}</p>}

      <div className="flex flex-wrap gap-2">
        <button disabled={busy} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-60">
          {busy ? "Saving…" : "Save banner"}
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Banner home page par hero ke baad dikhega, expiry tak live countdown chalega. Disable karne par gayab ho jayega.
      </p>
    </form>
  );
}


function PincodesTab({ reload }: { reload: () => void }) {
  const [rows, setRows] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [totalInDataset, setTotalInDataset] = useState(0);
  const [overrides, setOverrides] = useState(0);
  const [hiddenCount, setHiddenCount] = useState(0);
  const [defaults, setDefaults] = useState<Record<string, number>>({});
  const [zoneLabels, setZoneLabels] = useState<Record<string, string>>({});
  const [freeAbove, setFreeAbove] = useState(999);
  const [q, setQ] = useState("");
  const [zoneF, setZoneF] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    pin: "", city: "", state: "", district: "",
    zone: "tier2", shipping: "69", codAvailable: true, serviceable: true,
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sp = new URLSearchParams();
      if (q) sp.set("q", q);
      if (zoneF) sp.set("zone", zoneF);
      if (showHidden) sp.set("hidden", "true");
      sp.set("page", String(page));
      sp.set("limit", String(limit));
      const d = await j(`/api/admin/pincodes?${sp.toString()}`);
      setRows(d.rows);
      setTotal(d.total);
      setTotalInDataset(d.totalInDataset ?? 0);
      setOverrides(d.overrides ?? 0);
      setHiddenCount(d.hiddenCount ?? 0);
      setDefaults(d.defaultCharges ?? {});
      setZoneLabels(d.zoneLabels ?? {});
      setFreeAbove(d.freeShippingAbove ?? 999);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't load pincodes.");
    } finally {
      setLoading(false);
    }
  }, [q, zoneF, page, limit, showHidden]);

  useEffect(() => { load().catch(() => {}); }, [load]);

  const lookup = async () => {
    if (!/^[1-9]\d{5}$/.test(form.pin)) { setErr("Enter a valid 6-digit PIN code."); return; }
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/pincode?pin=${form.pin}`);
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "PIN not found.");
      setForm((f) => ({
        ...f,
        city: d.city || f.city,
        state: d.state || f.state,
        district: d.district || f.district,
        zone: d.zone,
        shipping: String(d.shipping),
      }));
      setPage(1);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lookup failed.");
    } finally { setBusy(false); }
  };

  const editRow = (r: any) => {
    setForm({
      pin: r.pin, city: r.city, state: r.state, district: r.district,
      zone: r.zone, shipping: String(r.shipping),
      codAvailable: true, serviceable: true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setErr(null);
    try {
      await j("/api/admin/pincodes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, shipping: Number(form.shipping) }),
      });
      setForm({ pin: "", city: "", state: "", district: "", zone: "tier2", shipping: String(defaults.tier2 ?? 69), codAvailable: true, serviceable: true });
      await load();
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save pincode.");
    } finally { setBusy(false); }
  };

  const resetRow = async (pin: string) => {
    if (!confirm(`Remove custom charge for ${pin}? Default zone charge will apply.`)) return;
    try {
      await j(`/api/admin/pincodes?pin=${pin}&mode=reset`, { method: "DELETE" });
      await load();
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't reset.");
    }
  };

  // Poori entry hatao (custom override ya list se hide)
  const deleteRow = async (pin: string) => {
    if (!confirm(`Delete pincode ${pin}? It will be removed from the delivery list.`)) return;
    setErr(null);
    try {
      await j(`/api/admin/pincodes?pin=${pin}`, { method: "DELETE" });
      setForm((f) => (f.pin === pin ? { ...f, pin: "", city: "", state: "", district: "" } : f));
      await load();
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't delete pincode.");
    }
  };

  // Hidden pincode wapas lao
  const restoreRow = async (pin: string) => {
    setErr(null);
    try {
      await j(`/api/admin/pincodes/restore?pin=${pin}`, { method: "POST" });
      await load();
      reload();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't restore pincode.");
    }
  };

  const F = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold";
  const L = "block text-xs font-semibold uppercase tracking-wider text-muted-foreground";
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="space-y-5">
      {/* Zone defaults */}
      <div className="rounded-xl border border-gold/30 bg-gold/[0.05] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-semibold">Default zone charges (dummy, applied automatically)</p>
          <span className="text-xs text-muted-foreground">
            {totalInDataset.toLocaleString("en-IN")} pincodes · {overrides} custom
          </span>
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(defaults).map(([z, v]) => (
            <div key={z} className="rounded-lg bg-card px-3 py-2 shadow-sm">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{zoneLabels[z] ?? z}</p>
              <p className="font-display text-xl font-semibold text-primary">₹{v}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Har pincode ka charge zone se auto aata hai. Neeche kisi pincode par charge change karoge to wo custom override ban jayega. Free shipping ₹{freeAbove}+ par.
        </p>
      </div>

      {/* Add / override form */}
      <form onSubmit={save} className="space-y-3 rounded-xl border border-border bg-card p-5">
        <h3 className="font-semibold">Set custom charge for a pincode</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-medium">
            <span className={L}>PIN code *</span>
            <span className="mt-1.5 flex gap-2">
              <input value={form.pin} onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })} required inputMode="numeric" maxLength={6} placeholder="110001" className={`${F} font-mono`} />
              <button type="button" onClick={lookup} disabled={busy} className="shrink-0 rounded-md border border-primary px-3 text-xs font-medium text-primary hover:bg-primary hover:text-primary-foreground">Lookup</button>
            </span>
          </label>
          <label className="text-sm font-medium">
            <span className={L}>City *</span>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required placeholder="New Delhi" className={`${F} mt-1.5`} />
          </label>
          <label className="text-sm font-medium">
            <span className={L}>State *</span>
            <input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} required placeholder="Delhi" className={`${F} mt-1.5`} />
          </label>
          <label className="text-sm font-medium">
            <span className={L}>District</span>
            <input value={form.district} onChange={(e) => setForm({ ...form, district: e.target.value })} placeholder="New Delhi" className={`${F} mt-1.5`} />
          </label>
          <label className="text-sm font-medium">
            <span className={L}>Zone</span>
            <select value={form.zone} onChange={(e) => setForm({ ...form, zone: e.target.value, shipping: String(defaults[e.target.value] ?? 69) })} className={`${F} mt-1.5`}>
              {Object.keys(defaults).map((z) => (
                <option key={z} value={z}>{zoneLabels[z] ?? z} (₹{defaults[z]})</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium">
            <span className={L}>Delivery charge (₹) *</span>
            <input value={form.shipping} onChange={(e) => setForm({ ...form, shipping: e.target.value })} required type="number" min={0} max={100000} className={`${F} mt-1.5`} />
          </label>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.codAvailable} onChange={(e) => setForm({ ...form, codAvailable: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> COD available
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.serviceable} onChange={(e) => setForm({ ...form, serviceable: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> Serviceable
          </label>
        </div>
        {err && <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">{err}</p>}
        <button disabled={busy} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-60">
          {busy ? "Saving…" : "Save custom charge"}
        </button>
      </form>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search PIN, city, district, state…" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <select value={zoneF} onChange={(e) => { setZoneF(e.target.value); setPage(1); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">All zones</option>
          {Object.keys(defaults).map((z) => <option key={z} value={z}>{zoneLabels[z] ?? z}</option>)}
        </select>
        <select value={limit} onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
          {[50, 100, 200, 500].map((n) => <option key={n} value={n}>{n} / page</option>)}
        </select>
        <label className="flex items-center gap-2 whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm">
          <input type="checkbox" checked={showHidden} onChange={(e) => { setShowHidden(e.target.checked); setPage(1); }} className="h-4 w-4 accent-[var(--primary)]" />
          Include hidden ({hiddenCount})
        </label>
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {rows.length} of {total.toLocaleString("en-IN")} pincodes · Page {page} of {totalPages}
      </p>

      {/* List */}
      {loading ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Loading pincodes…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2.5">PIN</th>
                <th className="px-3 py-2.5">City / District</th>
                <th className="px-3 py-2.5">State</th>
                <th className="px-3 py-2.5">Zone</th>
                <th className="px-3 py-2.5 text-right">Charge</th>
                <th className="px-3 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.pin} className="border-t border-border/60 hover:bg-secondary/30">
                  <td className="px-3 py-2 font-mono font-semibold">{r.pin}</td>
                  <td className="px-3 py-2">
                    {r.city}
                    {r.district && <span className="block text-xs text-muted-foreground">{r.district}</span>}
                  </td>
                  <td className="px-3 py-2 text-xs">{r.state}</td>
                  <td className="px-3 py-2">
                    <span className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-medium capitalize",
                      r.zone === "metro" ? "bg-primary/10 text-primary"
                      : r.zone === "remote" ? "bg-destructive/10 text-destructive"
                      : "bg-gold/15 text-cocoa",
                    )}>{r.zone}</span>
                    {r.source === "override" && (
                      <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">custom</span>
                    )}
                    {r.source === "hidden" && (
                      <span className="ml-1 rounded-full bg-border px-2 py-0.5 text-[11px] font-medium text-muted-foreground">hidden</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-primary">₹{r.shipping}</td>
                  <td className="px-3 py-2 text-right">
                    <span className="inline-flex items-center justify-end gap-1.5">
                      {r.source === "hidden" ? (
                        <button
                          onClick={() => restoreRow(r.pin)}
                          title="Restore this pincode"
                          className="rounded border border-primary px-2 py-0.5 text-xs font-medium text-primary hover:bg-primary hover:text-white"
                        >
                          Restore
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => editRow(r)}
                            className="rounded border border-input px-2 py-0.5 text-xs hover:border-gold"
                          >
                            Edit
                          </button>
                          {r.source === "override" && (
                            <button
                              onClick={() => resetRow(r.pin)}
                              title="Remove custom charge, apply default zone charge"
                              className="rounded border border-input px-2 py-0.5 text-xs text-muted-foreground hover:border-gold"
                            >
                              Reset
                            </button>
                          )}
                        </>
                      )}
                      <button
                        onClick={() => deleteRow(r.pin)}
                        aria-label={`Delete ${r.pin}`}
                        title="Delete from delivery list"
                        className="rounded border border-destructive/40 px-2 py-0.5 text-xs text-destructive hover:bg-destructive hover:text-white"
                      >
                        Delete
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="rounded-md border border-input px-4 py-2 text-sm disabled:opacity-40">Previous</button>
          <span className="text-sm">Page {page} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="rounded-md border border-input px-4 py-2 text-sm disabled:opacity-40">Next</button>
        </div>
      )}
    </div>
  );
}
