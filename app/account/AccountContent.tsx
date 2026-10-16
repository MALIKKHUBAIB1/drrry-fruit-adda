"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, KeyRound, LogOut, Mail, MapPin, Package, Pencil, ShoppingBag, User as UserIcon, X } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { inr } from "@/lib/products";
import { api, type ApiOrder } from "@/lib/api";

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
  "mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold";

export default function AccountContent() {
  const { user, logout, refresh } = useAuth();
  const { count, wishlist } = useStore();
  const router = useRouter();
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [addresses, setAddresses] = useState<Address[]>([]);

  const [editName, setEditName] = useState(false);
  const [name, setName] = useState("");
  const [nameErr, setNameErr] = useState<string | null>(null);

  const [showPass, setShowPass] = useState(false);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [passMsg, setPassMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadOrders = () => {
    if (!user) return;
    setOrdersLoading(true);
    fetch("/api/orders", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setOrders(d.orders ?? []))
      .catch(() => {})
      .finally(() => setOrdersLoading(false));
  };

  useEffect(() => {
    loadOrders();
    if (user) {
      setName(user.name);
      fetch("/api/addresses", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => setAddresses(d.addresses ?? []))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  if (!user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <UserIcon className="mx-auto h-12 w-12 text-gold" />
        <h1 className="mt-4 font-display text-4xl font-semibold">You&apos;re logged out</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Login to see your account, wishlist and faster checkout.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Link
            href="/login"
            className="rounded-full bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa"
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
    } catch (e) {
      setNameErr(e instanceof Error ? e.message : "Couldn't update name.");
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    try {
      await api("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ current, password: next }),
      });
      setPassMsg({ ok: true, text: "Password changed. Please login again." });
      setCurrent("");
      setNext("");
      setTimeout(() => router.push("/login"), 1500);
    } catch (e) {
      setPassMsg({ ok: false, text: e instanceof Error ? e.message : "Couldn't change password." });
    }
  };

  const cancelOrder = async (id: string) => {
    if (!confirm(`Cancel order ${id}?`)) return;
    try {
      await api(`/api/orders/${id}/cancel`, { method: "POST" });
      loadOrders();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Couldn't cancel order.");
    }
  };

  const deleteAddress = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    try {
      await api(`/api/addresses/${id}`, { method: "DELETE" });
      setAddresses((a) => a.filter((x) => x.id !== id));
    } catch {}
  };

  const makeDefault = async (id: string) => {
    try {
      const d = await api<{ address: Address }>(`/api/addresses/${id}`, {
        method: "PUT",
        body: JSON.stringify({ isDefault: true }),
      });
      setAddresses((list) =>
        list.map((x) => ({ ...x, isDefault: x.id === d.address.id })),
      );
    } catch {}
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <div className="flex items-center gap-4">
        <span className="grid h-16 w-16 place-items-center rounded-full bg-primary font-display text-3xl font-semibold text-primary-foreground">
          {initial}
        </span>
        <div className="min-w-0 flex-1">
          {editName ? (
            <span className="flex items-center gap-2">
              <input value={name} onChange={(e) => setName(e.target.value)} className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-lg" />
              <button onClick={saveName} className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground">Save</button>
              <button onClick={() => { setEditName(false); setName(user.name); }} aria-label="Cancel" className="rounded-md border border-input p-1.5"><X className="h-4 w-4" /></button>
            </span>
          ) : (
            <h1 className="flex items-center gap-2 font-display text-4xl font-semibold">
              <span className="truncate">{user.name}</span>
              <button onClick={() => setEditName(true)} aria-label="Edit name" className="text-muted-foreground hover:text-primary"><Pencil className="h-4 w-4" /></button>
            </h1>
          )}
          {nameErr && <p className="text-xs text-destructive">{nameErr}</p>}
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Mail className="h-3.5 w-3.5" /> {user.email}
            {user.isAdmin && (
              <Link href="/admin" className="ml-2 rounded-full bg-gold/20 px-2.5 py-0.5 text-[11px] font-semibold text-cocoa hover:bg-gold/30">
                Admin Panel →
              </Link>
            )}
          </p>
        </div>
      </div>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/cart"
          className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <ShoppingBag className="h-5 w-5 text-primary" />
          <span>
            <span className="block font-medium">My Cart</span>
            <span className="block text-xs text-muted-foreground">
              {count} item{count === 1 ? "" : "s"}
            </span>
          </span>
        </Link>
        <Link
          href="/wishlist"
          className="flex items-center gap-3 rounded-2xl border border-black/[0.06] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
        >
          <Heart className="h-5 w-5 text-primary" />
          <span>
            <span className="block font-medium">Wishlist</span>
            <span className="block text-xs text-muted-foreground">{wishlist.length} saved</span>
          </span>
        </Link>
      </div>

      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Package className="h-5 w-5 text-primary" /> My Orders
        </h2>
        {ordersLoading ? (
          <p className="mt-3 text-sm text-muted-foreground">Loading orders…</p>
        ) : orders.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No orders yet.{" "}
            <Link href="/shop" className="font-medium text-primary hover:underline">
              Shop now →
            </Link>
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {orders.map((o) => (
              <li key={o.id} className="rounded-xl border border-black/[0.06] bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm font-semibold">{o.id}</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                    {o.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(o.createdAt).toLocaleString("en-IN")} · {o.items.reduce((s, x) => s + x.qty, 0)} items ·{" "}
                  {o.payment === "cod" ? "COD" : "Online"}
                </p>
                <ul className="mt-2 space-y-1 text-sm">
                  {o.items.map((it) => (
                    <li key={it.slug + it.variant} className="flex justify-between gap-2">
                      <span className="min-w-0 truncate">
                        {it.name} <span className="text-muted-foreground">({it.variant} × {it.qty})</span>
                      </span>
                      <span className="shrink-0 font-medium">{inr(it.price * it.qty)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-sm font-semibold">
                  <span>Total <span className="font-normal text-muted-foreground">{inr(o.total)}</span></span>
                  {o.status === "placed" ? (
                    <button onClick={() => cancelOrder(o.id)} className="text-xs font-medium text-destructive hover:underline">
                      Cancel order
                    </button>
                  ) : (
                    <span className="text-xs font-medium capitalize text-muted-foreground">{o.status}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <MapPin className="h-5 w-5 text-primary" /> Saved Addresses
        </h2>
        {addresses.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            No saved addresses. One gets saved automatically at checkout.
          </p>
        ) : (
          <ul className="mt-3 space-y-3">
            {addresses.map((a) => (
              <li key={a.id} className="rounded-xl border border-black/[0.06] bg-white p-4 text-sm shadow-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold">
                    {a.label}
                    {a.isDefault && (
                      <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">Default</span>
                    )}
                  </span>
                  <span className="flex gap-2 text-xs">
                    {!a.isDefault && (
                      <button onClick={() => makeDefault(a.id)} className="text-primary hover:underline">Make default</button>
                    )}
                    <button onClick={() => deleteAddress(a.id)} className="text-destructive hover:underline">Delete</button>
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">
                  {a.name} · {a.phone}
                  <br />
                  {a.address}, {a.city}, {a.state} — {a.pin}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <KeyRound className="h-5 w-5 text-primary" /> Change Password
        </h2>
        {!showPass ? (
          <button onClick={() => setShowPass(true)} className="mt-3 rounded-md border border-input px-4 py-2 text-sm hover:border-gold">
            Change password
          </button>
        ) : (
          <form onSubmit={changePassword} className="mt-3 space-y-3">
            <label className="block text-sm font-medium">
              Current password
              <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} required autoComplete="current-password" className={inputCls} />
            </label>
            <label className="block text-sm font-medium">
              New password (min 6 characters)
              <input type="password" value={next} onChange={(e) => setNext(e.target.value)} required minLength={6} autoComplete="new-password" className={inputCls} />
            </label>
            {passMsg && (
              <p className={`text-sm ${passMsg.ok ? "text-primary" : "text-destructive"}`}>{passMsg.text}</p>
            )}
            <div className="flex gap-2">
              <button className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-cocoa">
                Update password
              </button>
              <button type="button" onClick={() => setShowPass(false)} className="rounded-md border border-input px-4 py-2 text-sm">
                Cancel
              </button>
            </div>
            <p className="text-xs text-muted-foreground">All devices will be logged out for security.</p>
          </form>
        )}
      </div>

      <button
        onClick={async () => {
          await logout();
          router.push("/");
        }}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-full border border-black/10 py-3 text-sm font-medium hover:border-destructive hover:text-destructive"
      >
        <LogOut className="h-4 w-4" /> Logout
      </button>
      <p className="mt-3 text-center text-xs text-muted-foreground">
        Orders and account are safely stored in the local database.
      </p>
    </div>
  );
}
