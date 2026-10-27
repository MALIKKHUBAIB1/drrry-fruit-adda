"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronRight, Heart, KeyRound, Loader2, LogOut, Mail, MapPin, Package, Pencil, Plus, ShoppingBag, Trash2, TriangleAlert, Truck, User as UserIcon, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { inr } from "@/lib/products";
import { api, type ApiOrder } from "@/lib/api";
import { useOrderStream } from "@/lib/useOrderStream";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Address = {
  id: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  isDefault: boolean;
};

const inputCls =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold";

const emptyAddr = {
  label: "Home",
  name: "",
  phone: "",
  address: "",
  city: "",
  state: "",
  pin: "",
};

const TABS = [
  { id: "overview", label: "Overview", Icon: UserIcon },
  { id: "orders", label: "My Orders", Icon: Package },
  { id: "addresses", label: "Addresses", Icon: MapPin },
  { id: "profile", label: "Profile & Security", Icon: KeyRound },
] as const;

type TabId = (typeof TABS)[number]["id"];

const STATUS_STYLE: Record<string, string> = {
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-destructive/10 text-destructive",
  packed: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  "out-for-delivery": "bg-amber-100 text-amber-800",
  placed: "bg-gold/20 text-cocoa",
};

const labelStatus = (s: string) =>
  s === "out-for-delivery"
    ? "Out for Delivery"
    : s.charAt(0).toUpperCase() + s.slice(1);

export default function AccountContent() {
  const { user, loading, logout, refresh } = useAuth();
  const { count, wishlist } = useStore();
  const router = useRouter();

  const [tab, setTab] = useState<TabId>("overview");
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("all");
  const [openOrder, setOpenOrder] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [editName, setEditName] = useState(false);
  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);

  const [addrForm, setAddrForm] = useState({ ...emptyAddr });
  const [addrOpen, setAddrOpen] = useState(false);

  // Danger zone — delete account
  const [dangerOpen, setDangerOpen] = useState(false);
  const [delPass, setDelPass] = useState("");
  const [delConfirm, setDelConfirm] = useState("");
  const [delErr, setDelErr] = useState<string | null>(null);
  const [delBusy, setDelBusy] = useState(false);
  const [addrBusy, setAddrBusy] = useState(false);
  const [addrErr, setAddrErr] = useState<string | null>(null);

  const loadOrders = () => {
    if (!user) return;
    setOrdersLoading(true);
    fetch("/api/orders", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  };

  const loadAddresses = () => {
    if (!user) return;
    fetch("/api/addresses", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setAddresses(d.addresses ?? []))
      .catch(() => {});
  };

  useOrderStream(orders[0]?.id ?? null, loadOrders);

  useEffect(() => {
    loadOrders();
    loadAddresses();
    if (user) setName(user.name);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const stats = useMemo(() => {
    const live = orders.filter((o) => o.status !== "cancelled");
    return {
      totalOrders: orders.length,
      active: orders.filter((o) => o.status === "placed" || o.status === "packed" || o.status === "shipped" || o.status === "out-for-delivery").length,
      delivered: orders.filter((o) => o.status === "delivered").length,
      spent: live.reduce((s, o) => s + o.total, 0),
    };
  }, [orders]);

  const filtered = useMemo(
    () => (orderFilter === "all" ? orders : orders.filter((o) => o.status === orderFilter)),
    [orders, orderFilter],
  );

  if (loading)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <Loader2 className="mx-auto h-10 w-10 animate-spin text-gold" />
        <p className="mt-4 text-sm text-muted-foreground">Loading your account…</p>
      </div>
    );

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <UserIcon className="mx-auto h-14 w-14 text-gold" />
        <h1 className="mt-4 font-display text-4xl font-semibold">You&apos;re logged out</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Login to see your orders, addresses and wishlist.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/login"
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            Login
          </Link>
          <Link
            href="/register"
            className="rounded-full border border-black/10 px-6 py-2.5 text-sm font-medium hover:border-primary hover:text-primary"
          >
            Register
          </Link>
        </div>
      </div>
    );
  }

  const initial = user.name.trim().charAt(0).toUpperCase() || "D";

  const saveName = async () => {
    setNameErr(null);
    try {
      await api<{ user: typeof user }>("/api/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ name }),
      });
      await refresh();
      setEditName(false);
      toast.success("Name updated.");
    } catch (e) {
      setNameErr(e instanceof Error ? e.message : "Couldn't update name.");
    }
  };

  const cancelOrder = async (id: string) => {
    if (!confirm(`Cancel order ${id}?\n\nPaid online? Refund will be initiated to your source account.`)) return;
    try {
      const r = await api<{ refund?: { status?: string; error?: string } }>(
        `/api/orders/${id}/cancel`,
        { method: "POST" },
      );
      const rs = r?.refund?.status;
      if (rs === "refunded") {
        toast.success("Order cancelled. Refund initiated — it reaches your account in 5–7 working days.");
      } else if (rs === "failed") {
        toast.warning(
          "Order cancelled. Refund couldn't be processed automatically — our team will contact you shortly.",
        );
      } else {
        toast.success("Order cancelled.");
      }
      loadOrders();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't cancel order.");
    }
  };

  const makeDefault = async (id: string) => {
    try {
      const d = await api<{ address: Address }>(`/api/addresses/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isDefault: true }),
      });
      setAddresses((list) => list.map((x) => ({ ...x, isDefault: x.id === d.address.id })));
      toast.success("Default address updated.");
    } catch {
      toast.error("Couldn't update address.");
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      await api(`/api/addresses/${id}`, { method: "DELETE" });
      setAddresses((a) => a.filter((x) => x.id !== id));
      toast.success("Address deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete address.");
    }
  };

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddrBusy(true);
    setAddrErr(null);
    try {
      await api("/api/addresses", { method: "POST", body: JSON.stringify(addrForm) });
      setAddrForm({ ...emptyAddr });
      setAddrOpen(false);
      loadAddresses();
      toast.success("Address saved.");
    } catch (e) {
      setAddrErr(e instanceof Error ? e.message : "Couldn't save address.");
    } finally {
      setAddrBusy(false);
    }
  };

  const deleteAccount = async () => {
    setDelBusy(true);
    setDelErr(null);
    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: delPass, confirm: delConfirm }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setDelErr(d.error || "Couldn't delete the account. Try again.");
        setDelBusy(false);
        return;
      }
      // Session API ne clear kar di — ab logout + home bhejo.
      await logout();
      toast.success("Your account has been deleted.");
      router.push("/");
    } catch {
      setDelErr("Something went wrong. Please try again.");
      setDelBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
      {/* Profile header */}
      <div className="relative overflow-hidden rounded-2xl bg-cocoa p-6 shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold/20 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-5">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gold font-display text-3xl font-bold text-cocoa">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            {editName ? (
              <span className="flex flex-wrap items-center gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="min-w-0 flex-1 rounded-md border border-gold/30 bg-cocoa-foreground/10 px-3 py-2 text-xl text-cocoa-foreground outline-none focus:border-gold"
                />
                <button
                  onClick={saveName}
                  className="rounded-md bg-gold px-4 py-2 text-sm font-medium text-cocoa hover:brightness-110"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditName(false);
                    setName(user.name);
                  }}
                  aria-label="Cancel"
                  className="rounded-md border border-gold/30 p-2 text-cocoa-foreground/80 hover:border-gold"
                >
                  <X className="h-4 w-4" />
                </button>
              </span>
            ) : (
              <h1 className="flex items-center gap-2 font-display text-3xl font-semibold text-cocoa-foreground sm:text-4xl">
                <span className="truncate">{user.name}</span>
                <button
                  onClick={() => setEditName(true)}
                  aria-label="Edit name"
                  className="text-cocoa-foreground/50 hover:text-gold"
                >
                  <Pencil className="h-4 w-4" />
                </button>
              </h1>
            )}
            {nameErr && <p className="mt-1 text-xs text-red-300">{nameErr}</p>}
            <p className="mt-1 flex flex-wrap items-center gap-3 text-sm text-cocoa-foreground/70">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5" /> {user.email}
              </span>
              <span className="hidden sm:inline">Member since {new Date(user.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}</span>
              {user.isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-full bg-gold px-3 py-1 text-[11px] font-semibold text-cocoa hover:brightness-110"
                >
                  Admin Panel →
                </Link>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      {/* KPI cards — admin panel jaisa */}
      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total Orders", value: String(stats.totalOrders), sub: `${stats.active} in progress`, tone: "#c9a227" },
          { label: "In Progress", value: String(stats.active), sub: "on the way", tone: "#3a2e22" },
          { label: "Delivered", value: String(stats.delivered), sub: "completed", tone: "#3a2e22" },
          { label: "Total Spent", value: inr(stats.spent), sub: "all time", tone: "#c9a227" },
        ].map((k) => (
          <div
            key={k.label}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-sm"
          >
            <div
              className="absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-10"
              style={{ backgroundColor: k.tone }}
            />
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground">{k.label}</p>
            <p className="mt-1 font-display text-4xl font-semibold leading-none text-primary">
              {k.value}
            </p>
            <p className="mt-1.5 text-xs text-muted-foreground">{k.sub}</p>
          </div>
        ))}
      </div>
      {/* Tabs */}
      <div className="mt-8 flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition",
              tab === id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
            {id === "orders" && orders.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[11px] text-primary">
                {orders.length}
              </span>
            )}
            {id === "addresses" && addresses.length > 0 && (
              <span className="rounded-full bg-primary/10 px-1.5 text-[11px] text-primary">
                {addresses.length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {/* ---------------- OVERVIEW ---------------- */}
        {tab === "overview" && (
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Recent orders */}
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:col-span-2">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <h3 className="font-display text-lg font-semibold">Recent Orders</h3>
                {orders.length > 0 && (
                  <button
                    onClick={() => setTab("orders")}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    View all →
                  </button>
                )}
              </div>

              {ordersLoading ? (
                <p className="px-5 py-8 text-sm text-muted-foreground">Loading…</p>
              ) : orders.length === 0 ? (
                <div className="px-5 py-12 text-center">
                  <Package className="mx-auto h-8 w-8 text-gold" />
                  <p className="mt-2 text-sm text-muted-foreground">
                    No orders yet.{" "}
                    <Link href="/shop" className="font-medium text-primary hover:underline">
                      Start shopping
                    </Link>
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-border/70">
                  {orders.slice(0, 5).map((o) => {
                    const qty = o.items.reduce((n, i) => n + i.qty, 0);
                    return (
                      <li key={o.id} className="flex items-center gap-4 px-5 py-4">
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-sm font-semibold tracking-wide">{o.id}</p>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {o.items[0]?.name ?? "Mixed box"}
                            {qty > 1 ? ` +${qty - 1} more` : ""} ·{" "}
                            {new Date(o.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                            })}
                          </p>
                        </div>

                        <span
                          className={cn(
                            "shrink-0 rounded-full px-3 py-1 text-xs font-medium",
                            STATUS_STYLE[o.status] ?? "bg-border text-muted-foreground",
                          )}
                        >
                          {labelStatus(o.status)}
                        </span>

                        <b className="w-20 shrink-0 text-right font-display text-base text-primary">
                          {inr(o.total)}
                        </b>

                        <Link
                          href={`/track?id=${o.id}`}
                          aria-label={`Track order ${o.id}`}
                          className="shrink-0 rounded-lg p-2 text-muted-foreground transition hover:bg-secondary hover:text-primary"
                        >
                          <Truck className="h-5 w-5" />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* Right rail */}
            <div className="space-y-4">
              {/* Quick links */}
              <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                {[
                  {
                    label: "My Cart",
                    value: `${count} item${count === 1 ? "" : "s"}`,
                    href: "/cart",
                    Icon: ShoppingBag,
                  },
                  {
                    label: "Wishlist",
                    value: `${wishlist.length} saved`,
                    href: "/wishlist",
                    Icon: Heart,
                  },
                  {
                    label: "Continue shopping",
                    value: "Fresh arrivals",
                    href: "/shop",
                    Icon: Package,
                  },
                  {
                    label: "Contact support",
                    value: "We reply within 24h",
                    href: "/contact",
                    Icon: Mail,
                  },
                ].map(({ label, value, href, Icon }, i) => (
                  <Link
                    key={label}
                    href={href}
                    className={cn(
                      "group flex items-center gap-3 px-5 py-3.5 transition hover:bg-secondary/60",
                      i > 0 && "border-t border-border/70",
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0 text-primary" />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{label}</span>
                      <span className="block text-xs text-muted-foreground">{value}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground/40 transition group-hover:translate-x-0.5" />
                  </Link>
                ))}
              </div>

              {/* Delivery address */}
              <div className="rounded-2xl border border-border bg-card shadow-sm">
                <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
                  <h3 className="font-display text-base font-semibold">Delivery Address</h3>
                  {addresses.length > 0 && (
                    <button
                      onClick={() => setTab("addresses")}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Manage →
                    </button>
                  )}
                </div>

                {addresses.length === 0 ? (
                  <div className="px-5 py-7 text-center">
                    <MapPin className="mx-auto h-6 w-6 text-gold" />
                    <p className="mt-1.5 text-xs text-muted-foreground">No saved address yet</p>
                    <button
                      onClick={() => {
                        setTab("addresses");
                        setAddrOpen(true);
                      }}
                      className="mt-3 rounded-full bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary-hover"
                    >
                      Add address
                    </button>
                  </div>
                ) : (
                  (() => {
                    const a = addresses.find((x) => x.isDefault) ?? addresses[0];
                    return (
                      <div className="px-5 py-4 text-sm">
                        <p className="flex items-center gap-2 font-medium">
                          <MapPin className="h-3.5 w-3.5 text-gold" />
                          {a.label}
                          {a.isDefault && (
                            <span className="rounded-full bg-gold/15 px-1.5 py-0.5 text-[10px] font-semibold text-gold">
                              Default
                            </span>
                          )}
                        </p>
                        <p className="mt-1.5 leading-relaxed text-muted-foreground">
                          {a.name} · {a.phone}
                          <br />
                          {a.address}
                          <br />
                          {a.city}, {a.state} — {a.pin}
                        </p>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
        )}


        {/* ---------------- ORDERS ---------------- */}
        {tab === "orders" && (
          <div>
            <div className="flex flex-wrap gap-2">
              {[
                ["all", "All"],
                ["placed", "Placed"],
                ["packed", "Packed"],
                ["shipped", "Shipped"],
                ["out-for-delivery", "Out for Delivery"],
                ["delivered", "Delivered"],
                ["cancelled", "Cancelled"],
              ].map(([v, l]) => (
                <button
                  key={v}
                  onClick={() => setOrderFilter(v)}
                  className={cn(
                    "rounded-full border px-3.5 py-1.5 text-xs font-medium transition",
                    orderFilter === v
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input text-muted-foreground hover:border-gold",
                  )}
                >
                  {l}
                </button>
              ))}
            </div>

            {ordersLoading ? (
              <p className="mt-6 text-sm text-muted-foreground">Loading orders…</p>
            ) : filtered.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
                <Package className="mx-auto h-10 w-10 text-gold" />
                <p className="mt-3 font-medium">No orders here</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {orderFilter === "all"
                    ? "You haven't placed any order yet."
                    : `No ${labelStatus(orderFilter).toLowerCase()} orders.`}
                </p>
                <Link
                  href="/shop"
                  className="mt-4 inline-block rounded-md bg-primary px-6 py-2.5 text-sm text-primary-foreground"
                >
                  Start shopping
                </Link>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {filtered.map((o) => {
                  const isOpen = openOrder === o.id;
                  return (
                    <li
                      key={o.id}
                      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
                    >
                      <button
                        onClick={() => setOpenOrder(isOpen ? null : o.id)}
                        className="flex w-full flex-wrap items-center justify-between gap-3 px-5 py-4 text-left hover:bg-secondary/40"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold">{o.id}</span>
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-medium",
                                STATUS_STYLE[o.status] ?? "bg-border text-muted-foreground",
                              )}
                            >
                              {labelStatus(o.status)}
                            </span>
                            {o.paymentStatus === "refunded" && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
                                Refunded
                              </span>
                            )}
                            {o.status === "cancelled" && o.payment === "online" && o.paymentStatus !== "refunded" && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                Refund pending
                              </span>
                            )}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {new Date(o.createdAt).toLocaleString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                            {" · "}
                            {o.payment === "cod" ? "Cash on Delivery" : "Paid online"}
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <b className="font-display text-lg text-primary">{inr(o.total)}</b>
                          <ChevronDown
                            className={cn("h-4 w-4 text-muted-foreground transition", isOpen && "rotate-180")}
                          />
                        </span>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border bg-secondary/30 px-5 py-4">
                          <ul className="space-y-2">
                            {o.items.map((it) => (
                              <li key={it.slug + it.variant} className="flex items-center gap-3 text-sm">
                                <img
                                  src={it.image}
                                  alt=""
                                  className="h-12 w-12 rounded-lg border border-border object-cover"
                                />
                                <span className="min-w-0 flex-1">
                                  <Link
                                    href={`/product/${it.slug}`}
                                    className="font-medium hover:text-primary"
                                  >
                                    {it.name}
                                  </Link>
                                  <span className="block text-xs text-muted-foreground">
                                    {it.variant} × {it.qty}
                                  </span>
                                </span>
                                <b>{inr(it.price * it.qty)}</b>
                              </li>
                            ))}
                          </ul>

                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                            <Link
                              href={`/track?id=${o.id}`}
                              className="flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                            >
                              <Truck className="h-3.5 w-3.5" /> Track this order
                            </Link>
                            {o.status !== "out-for-delivery" &&
                              o.status !== "delivered" &&
                              o.status !== "cancelled" && (
                              <button
                                onClick={() => cancelOrder(o.id)}
                                className="text-xs font-medium text-destructive hover:underline"
                              >
                                Cancel order
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {/* ---------------- ADDRESSES ---------------- */}
        {tab === "addresses" && (
          <div>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Saved Addresses</h3>
              <button
                onClick={() => setAddrOpen((s) => !s)}
                className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
              >
                <Plus className="h-4 w-4" /> Add address
              </button>
            </div>

            {addrOpen && (
              <form onSubmit={saveAddress} className="mt-4 space-y-3 rounded-2xl border border-gold/40 bg-card p-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Label</span>
                    <input value={addrForm.label} onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })} placeholder="Home / Office" className={`${inputCls} mt-1.5`} />
                  </label>
                  <label className="text-sm font-medium">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Full name *</span>
                    <input value={addrForm.name} onChange={(e) => setAddrForm({ ...addrForm, name: e.target.value })} required className={`${inputCls} mt-1.5`} />
                  </label>
                  <label className="text-sm font-medium">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Phone *</span>
                    <input value={addrForm.phone} onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })} required inputMode="numeric" maxLength={10} placeholder="9876543210" className={`${inputCls} mt-1.5`} />
                  </label>
                  <label className="text-sm font-medium sm:col-span-2">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">Street address *</span>
                    <textarea value={addrForm.address} onChange={(e) => setAddrForm({ ...addrForm, address: e.target.value })} required rows={2} className={`${inputCls} mt-1.5 resize-y`} />
                  </label>
                  <label className="text-sm font-medium">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">City *</span>
                    <input value={addrForm.city} onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })} required className={`${inputCls} mt-1.5`} />
                  </label>
                  <label className="text-sm font-medium">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">State *</span>
                    <input value={addrForm.state} onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })} required className={`${inputCls} mt-1.5`} />
                  </label>
                  <label className="text-sm font-medium">
                    <span className="text-xs uppercase tracking-wider text-muted-foreground">PIN code *</span>
                    <input value={addrForm.pin} onChange={(e) => setAddrForm({ ...addrForm, pin: e.target.value.replace(/\D/g, "").slice(0, 6) })} required inputMode="numeric" maxLength={6} className={`${inputCls} mt-1.5`} />
                  </label>
                </div>
                {addrErr && (
                  <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">
                    {addrErr}
                  </p>
                )}
                <div className="flex gap-2">
                  <button disabled={addrBusy} className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
                    {addrBusy ? "Saving…" : "Save address"}
                  </button>
                  <button type="button" onClick={() => { setAddrOpen(false); setAddrForm({ ...emptyAddr }); setAddrErr(null); }} className="rounded-md border border-input px-5 py-2.5 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {addresses.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border p-12 text-center">
                <MapPin className="mx-auto h-10 w-10 text-gold" />
                <p className="mt-3 font-medium">No saved addresses</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Save an address for faster checkout.
                </p>
              </div>
            ) : (
              <ul className="mt-5 grid gap-4 sm:grid-cols-2">
                {addresses.map((a) => (
                  <li
                    key={a.id}
                    className={cn(
                      "flex flex-col rounded-2xl border bg-card p-5 shadow-sm",
                      a.isDefault ? "border-gold" : "border-border",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-2 font-semibold">
                        <MapPin className="h-4 w-4 text-primary" /> {a.label}
                      </span>
                      {a.isDefault && (
                        <span className="rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-semibold text-cocoa">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">
                      {a.name} · {a.phone}
                      <br />
                      {a.address}
                      <br />
                      {a.city}, {a.state} — {a.pin}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-3 border-t border-border pt-3 text-xs">
                      {!a.isDefault && (
                        <button onClick={() => makeDefault(a.id)} className="font-medium text-primary hover:underline">
                          Set as default
                        </button>
                      )}
                      <button
                        onClick={() => deleteAddress(a.id)}
                        className="flex items-center gap-1 font-medium text-destructive hover:underline"
                      >
                        <Trash2 className="h-3 w-3" /> Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* ---------------- PROFILE ---------------- */}
        {tab === "profile" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h3 className="font-display text-lg font-semibold">Profile Information</h3>
              <div className="mt-4 space-y-4">
                <label className="block text-sm font-medium">
                  Full name
                  {editName ? (
                    <span className="mt-1.5 flex gap-2">
                      <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
                      <button onClick={saveName} className="shrink-0 rounded-md bg-primary px-4 text-primary-foreground">Save</button>
                    </span>
                  ) : (
                    <span className="mt-1.5 flex items-center justify-between rounded-md border border-input bg-background px-3 py-2">
                      {user.name}
                      <button onClick={() => setEditName(true)} aria-label="Edit name" className="text-muted-foreground hover:text-primary">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </span>
                  )}
                  {nameErr && <p className="mt-1 text-xs text-destructive">{nameErr}</p>}
                </label>
                <label className="block text-sm font-medium">
                  Email address
                  <span className="mt-1.5 flex items-center gap-2 rounded-md border border-input bg-secondary/50 px-3 py-2 text-muted-foreground">
                    <Mail className="h-4 w-4" /> {user.email}
                  </span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Email cannot be changed.
                  </span>
                </label>
                <label className="block text-sm font-medium">
                  Member since
                  <span className="mt-1.5 block rounded-md border border-input bg-secondary/50 px-3 py-2 text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </label>
              </div>
            </div>

            <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-6 lg:col-span-2">
              <h3 className="font-display text-lg font-semibold">Danger Zone</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Signing out ends your session on this device.
              </p>
              <button
                onClick={async () => {
                  await logout();
                  router.push("/");
                }}
                className="mt-4 flex items-center gap-2 rounded-md border border-destructive/40 px-5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive hover:text-white"
              >
                <LogOut className="h-4 w-4" /> Logout
              </button>
              </div>

              {/* ---------------- DANGER ZONE ---------------- */}
              <div className="mt-6 rounded-2xl border border-destructive/30 bg-destructive/[0.04] p-6 lg:col-span-2">
                <div className="flex items-start gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-destructive/10 text-destructive">
                    <TriangleAlert className="h-4.5 w-4.5" />
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-destructive">
                      Danger Zone
                    </h3>
                    <p className="mt-0.5 text-sm text-muted-foreground">
                      These actions are permanent and cannot be undone.
                    </p>
                  </div>
                </div>

                {!dangerOpen ? (
                  <button
                    onClick={() => setDangerOpen(true)}
                    className="mt-4 flex items-center gap-2 rounded-md border border-destructive/40 px-5 py-2.5 text-sm font-medium text-destructive transition hover:bg-destructive hover:text-white"
                  >
                    <Trash2 className="h-4 w-4" /> Delete my account
                  </button>
                ) : (
                  <div className="mt-5 rounded-xl border border-destructive/30 bg-card p-5">
                    <p className="text-sm font-medium text-foreground">
                      This will permanently delete:
                    </p>
                    <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                      <li>• Your profile, saved addresses and reviews</li>
                      <li>• Your wishlist, cart and newsletter subscription</li>
                      <li>
                        • Order history is kept for our records, but your name, email,
                        phone and address are removed
                      </li>
                    </ul>

                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <label className="text-sm font-medium">
                        Confirm with your password
                        <input
                          type="password"
                          value={delPass}
                          onChange={(e) => setDelPass(e.target.value)}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          className={cn(inputCls, "mt-1.5")}
                        />
                      </label>
                      <label className="text-sm font-medium">
                        Type <span className="font-mono font-bold text-destructive">DELETE</span> to confirm
                        <input
                          value={delConfirm}
                          onChange={(e) => setDelConfirm(e.target.value)}
                          placeholder="DELETE"
                          className={cn(inputCls, "mt-1.5 font-mono uppercase")}
                        />
                      </label>
                    </div>

                    {delErr && (
                      <p
                        role="alert"
                        className="mt-3 rounded-lg border border-destructive/30 bg-destructive/[0.07] px-3 py-2 text-sm text-destructive"
                      >
                        {delErr}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        onClick={deleteAccount}
                        disabled={delBusy || delConfirm !== "DELETE" || !delPass}
                        className="flex items-center gap-2 rounded-md bg-destructive px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        {delBusy ? "Deleting…" : "Permanently delete account"}
                      </button>
                      <button
                        onClick={() => {
                          setDangerOpen(false);
                          setDelPass("");
                          setDelConfirm("");
                          setDelErr(null);
                        }}
                        className="rounded-md border border-input px-5 py-2.5 text-sm font-medium hover:bg-secondary"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
        )}
      </div>
    </div>
  );
}