"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { categories, inr } from "@/lib/products";
import { cn } from "@/lib/utils";

async function j(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed.");
  return data;
}

const TABS = ["Overview", "Orders", "Products", "Categories", "Coupons", "Users", "Messages", "Reviews"] as const;
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
  const [coupons, setCoupons] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [subs, setSubs] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    try {
      const [s, o, p, cg, c, u, m, n, r] = await Promise.all([
        j("/api/admin/stats"),
        j("/api/admin/orders"),
        j("/api/admin/products"),
        j("/api/admin/categories"),
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
        <Link href="/login?redirect=/admin" className="mt-6 inline-block rounded-full bg-primary px-6 py-2.5 text-sm text-primary-foreground">
          Login
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
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Revenue" value={inr(stats.revenue)} />
        <Card label="Orders" value={String(stats.orders)} />
        <Card label="Users" value={String(stats.users)} />
        <Card label="Avg order" value={inr(stats.avgOrderValue)} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Orders by status</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {stats.byStatus.map((s: any) => (
              <li key={s.status} className="flex justify-between">
                <span className="capitalize">{s.status}</span>
                <b>{s.count}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-semibold">Top products</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {(stats.topProducts ?? []).map((p: any) => (
              <li key={p.slug} className="flex justify-between gap-2">
                <span className="truncate">{p.name} <span className="text-muted-foreground">× {p.qty}</span></span>
                <b className="shrink-0">{inr(p.revenue)}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card label="Products" value={String(stats.products)} />
        <Card label="Reviews" value={String(stats.reviews)} />
        <Card label="Messages" value={String(stats.pendingContacts)} />
        <Card label="Subscribers" value={String(stats.subscribers)} />
      </div>
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
  const [form, setForm] = useState({ code: "", pct: "10", min: "499" });
  const H = { "Content-Type": "application/json" };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    await j("/api/admin/coupons", { method: "POST", headers: H, body: JSON.stringify({ ...form, pct: Number(form.pct), min: Number(form.min) }) });
    setForm({ code: "", pct: "10", min: "499" });
    reload();
  };
  return (
    <div className="space-y-4">
      <form onSubmit={create} className="flex flex-wrap gap-2">
        <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} required placeholder="CODE" className="w-32 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase" />
        <input value={form.pct} onChange={(e) => setForm({ ...form, pct: e.target.value })} required type="number" min={1} max={90} placeholder="% off" className="w-24 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <input value={form.min} onChange={(e) => setForm({ ...form, min: e.target.value })} required type="number" min={0} placeholder="Min ₹" className="w-28 rounded-md border border-input bg-background px-3 py-2 text-sm" />
        <button className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">Add coupon</button>
      </form>
      <ul className="space-y-2">
        {coupons.map((c) => (
          <li key={c.code} className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3 text-sm">
            <b className="font-mono">{c.code}</b>
            <span className="text-muted-foreground">{c.pct}% off above {inr(c.min)}</span>
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
        ))}
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
