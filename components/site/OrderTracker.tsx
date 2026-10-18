"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  MapPin,
  Package,
  Radio,
  Search,
  Truck,
  Wallet,
} from "lucide-react";
import { inr } from "@/lib/products";
import { useAuth } from "@/lib/auth";
import { useOrderStream } from "@/lib/useOrderStream";
import { cn } from "@/lib/utils";

type TrackOrder = {
  id: string;
  status: string;
  statusLabel: string;
  placedAt: string;
  items: { name: string; variant: string; qty: number; image: string }[];
  itemCount: number;
  total: number;
  payment: "cod" | "online";
  deliveryLabel?: string;
  deliveryDays?: number;
  trackingNumber?: string;
  trackingUrl?: string;
  adminNote?: string;
  city: string;
  pin: string;
  history: { status: string; statusLabel: string; at: string; note?: string }[];
};

const STEPS = [
  { id: "placed", label: "Placed", Icon: CheckCircle2 },
  { id: "packed", label: "Packed", Icon: Package },
  { id: "shipped", label: "Shipped", Icon: Truck },
  { id: "out-for-delivery", label: "Out for delivery", Icon: MapPin },
  { id: "delivered", label: "Delivered", Icon: CheckCircle2 },
] as const;

export function OrderTracker() {
  const { user } = useAuth();
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);

  // Remember last search so a revisit works without typing again
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dfa-track");
      if (!raw) return;
      const p = JSON.parse(raw);
      if (p?.id) setOrderId(p.id);
      if (!user && p?.email) setEmail(p.email);
    } catch {}
  }, [user]);

  const lookup = useCallback(
    async (id: string, em?: string) => {
      const res = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id, email: em }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || "Couldn't find that order.");
      setOrder(d.order);
      try {
        localStorage.setItem("dfa-track", JSON.stringify({ id, email: em ?? user?.email }));
      } catch {}
    },
    [user],
  );

  const watchId = order?.id ?? orderId;
  const isLive = useOrderStream(watchId || null, () => {
    lookup(orderId || watchId, email || user?.email).catch(() => {});
  });
  useEffect(() => setLive(isLive), [isLive]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOrder(null);
    try {
      await lookup(orderId.trim(), user ? undefined : email.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  const stepIndex = order ? STEPS.findIndex((s) => s.id === order.status) : -1;
  const isCancelled = order?.status === "cancelled";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:py-16">
      {/* Hero */}
      <div className="text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-primary/10 text-primary">
          <Truck className="h-7 w-7" />
        </span>
        <h1 className="mt-4 font-display text-4xl font-semibold text-primary sm:text-5xl">
          Track your order
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          {user
            ? `You're signed in as ${user.email} — just enter your order ID.`
            : "Enter your order ID and the email you used at checkout."}
        </p>
      </div>

      {/* Search */}
      <form
        onSubmit={submit}
        className={cn(
          "mx-auto mt-8 flex max-w-xl flex-col gap-3 rounded-2xl border border-gold/30 bg-card p-5 shadow-sm",
          user ? "sm:flex-row sm:items-end" : "sm:grid sm:grid-cols-[1fr_1fr_auto]",
        )}
      >
        <label className="text-sm font-medium">
          Order ID
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            required
            placeholder="DFA-XXXXXX"
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 font-mono text-sm uppercase tracking-wide outline-none focus:border-gold"
          />
        </label>

        {!user && (
          <label className="text-sm font-medium">
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold"
            />
          </label>
        )}

        <button
          disabled={busy}
          className="flex shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {busy ? "Tracking…" : "Track order"}
        </button>
      </form>

      {err && (
        <p
          role="alert"
          className="mx-auto mt-4 max-w-xl rounded-xl border border-destructive/25 bg-destructive/[0.06] px-4 py-3 text-center text-sm text-destructive"
        >
          {err}
        </p>
      )}

      {order && (
        <div className="mt-8 space-y-5">
          {/* Status card */}
          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-cocoa px-5 py-4 text-cocoa-foreground sm:px-6">
              <div>
                <p className="font-mono text-sm font-semibold tracking-wide">{order.id}</p>
                <p className="mt-0.5 text-xs text-cocoa-foreground/70">
                  Placed {new Date(order.placedAt).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "inline-block rounded-full px-3 py-1 text-xs font-bold",
                    order.status === "delivered"
                      ? "bg-green-500 text-white"
                      : isCancelled
                        ? "bg-destructive text-white"
                        : "bg-gold text-cocoa",
                  )}
                >
                  {order.statusLabel}
                </span>
                <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-cocoa-foreground/70">
                  <Radio className={cn("h-3 w-3", live ? "animate-pulse text-green-400" : "")} />
                  {live ? "Live updates on" : "Auto-refresh every 10s"}
                </p>
              </div>
            </div>

            {/* Stepper */}
            {!isCancelled && (
              <div className="px-5 py-6 sm:px-6">
                <ol className="grid grid-cols-5 gap-1">
                  {STEPS.map((s, i) => {
                    const done = i <= stepIndex;
                    const current = i === stepIndex;
                    return (
                      <li key={s.id} className="relative flex flex-col items-center text-center">
                        {i > 0 && (
                          <span
                            className={cn(
                              "absolute right-1/2 top-4 -z-0 h-0.5 w-full",
                              i <= stepIndex ? "bg-primary" : "bg-border",
                            )}
                          />
                        )}
                        <span
                          className={cn(
                            "relative z-10 grid h-8 w-8 place-items-center rounded-full border-2 transition",
                            done
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground",
                            current && "ring-4 ring-primary/15",
                          )}
                        >
                          <s.Icon className="h-4 w-4" />
                        </span>
                        <p
                          className={cn(
                            "mt-2 text-[10px] leading-tight sm:text-[11px]",
                            done ? "font-semibold text-foreground" : "text-muted-foreground",
                          )}
                        >
                          {s.label}
                        </p>
                      </li>
                    );
                  })}
                </ol>
              </div>
            )}

            {isCancelled && (
              <div className="px-5 py-6 text-center sm:px-6">
                <p className="text-sm font-semibold text-destructive">This order was cancelled.</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  If you paid online, the refund will reach you in 5–7 working days.
                </p>
              </div>
            )}

            {/* Facts */}
            <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
              {[
                { label: "Total", value: inr(order.total) },
                { label: "Items", value: String(order.itemCount) },
                {
                  label: "Payment",
                  value: order.payment === "cod" ? "Cash on Delivery" : "Paid online",
                },
                {
                  label: "Delivery",
                  value: order.deliveryLabel ?? "Standard",
                },
              ].map((f) => (
                <div key={f.label} className="bg-card px-4 py-3">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {f.label}
                  </p>
                  <p className="mt-0.5 text-sm font-semibold text-primary">{f.value}</p>
                </div>
              ))}
            </div>

            {(order.trackingNumber || order.adminNote) && (
              <div className="space-y-2 border-t border-border bg-gold/[0.05] px-5 py-4 text-sm sm:px-6">
                {order.trackingNumber && (
                  <p className="flex flex-wrap items-center gap-2">
                    <Truck className="h-4 w-4 text-gold" />
                    <span className="text-muted-foreground">Tracking number:</span>
                    {order.trackingUrl ? (
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-mono font-semibold text-primary underline"
                      >
                        {order.trackingNumber}
                      </a>
                    ) : (
                      <span className="font-mono font-semibold">{order.trackingNumber}</span>
                    )}
                  </p>
                )}
                {order.adminNote && (
                  <p className="text-muted-foreground">
                    <b className="text-foreground">Note:</b> {order.adminNote}
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-2 border-t border-border px-5 py-3 text-sm sm:px-6">
              <MapPin className="h-4 w-4 text-primary" />
              <span className="text-muted-foreground">Delivering to</span>
              <b>
                {order.city} — {order.pin}
              </b>
            </div>
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Package className="h-5 w-5 text-primary" /> Items in this order
            </h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {order.items.map((it, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 rounded-xl border border-border/70 p-3 text-sm"
                >
                  <img
                    src={it.image}
                    alt=""
                    className="h-14 w-14 shrink-0 rounded-lg border border-border object-cover"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{it.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {it.variant} · Qty {it.qty}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Timeline */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Clock className="h-5 w-5 text-primary" /> Status history
            </h2>
            <ol className="mt-4 space-y-0">
              {[...order.history].reverse().map((h, i, arr) => (
                <li key={i} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < arr.length - 1 && (
                    <span className="absolute left-[5px] top-4 h-full w-px bg-border" />
                  )}
                  <span className="relative mt-1.5 h-3 w-3 shrink-0 rounded-full bg-primary ring-4 ring-card" />
                  <span className="min-w-0">
                    <b className="text-sm">{h.statusLabel}</b>
                    <span className="block text-xs text-muted-foreground">
                      {new Date(h.at).toLocaleString("en-IN")}
                      {h.note ? ` — ${h.note}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
            <Link
              href="/account"
              className="rounded-md bg-primary px-6 py-2.5 font-medium text-primary-foreground hover:bg-primary-hover"
            >
              View all my orders
            </Link>
            <Link href="/contact" className="text-primary hover:underline">
              Need help with this order?
            </Link>
          </div>
        </div>
      )}

      {!order && !err && (
        <div className="mx-auto mt-10 grid max-w-2xl gap-3 sm:grid-cols-3">
          {[
            { t: "Find your order ID", d: "It's in your confirmation email and on your account page." },
            { t: "Live status", d: "Updates appear here the moment we ship your parcel." },
            { t: "Need a hand?", d: "Our support team is happy to help with any order." },
          ].map((h) => (
            <div key={h.t} className="rounded-xl border border-border bg-card p-4 text-center">
              <p className="text-sm font-semibold">{h.t}</p>
              <p className="mt-1 text-xs text-muted-foreground">{h.d}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}