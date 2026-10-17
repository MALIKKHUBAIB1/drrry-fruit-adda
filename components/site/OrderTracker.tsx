"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2, MapPin, Package, Radio, Search, Truck } from "lucide-react";
import { inr } from "@/lib/products";
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

const STEPS = ["placed", "packed", "shipped", "out-for-delivery", "delivered"] as const;

export function OrderTracker() {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackOrder | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [saved, setSaved] = useState<{ id: string; email: string } | null>(null);

  // Remember last search so refresh/revisit works
  useEffect(() => {
    try {
      const raw = localStorage.getItem("dfa-track");
      if (raw) {
        const p = JSON.parse(raw);
        setOrderId(p.id ?? "");
        setEmail(p.email ?? "");
        setSaved(p);
      }
    } catch {}
  }, []);

  const lookup = async (id: string, em: string) => {
    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: id, email: em }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || "Couldn't find that order.");
    setOrder(d.order);
    try {
      localStorage.setItem("dfa-track", JSON.stringify({ id, email: em }));
      setSaved({ id, email: em });
    } catch {}
  };

  // Instant updates while the page is open
  const isLive = useOrderStream(order?.id ?? saved?.id ?? null, () => {
    const id = orderId || saved?.id;
    const em = email || saved?.email;
    if (!id || !em) return;
    lookup(id, em).catch(() => {});
  });
  useEffect(() => setLive(isLive), [isLive]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOrder(null);
    try {
      await lookup(orderId.trim(), email.trim());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:py-16">
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-gold">Order Tracking</p>
        <h1 className="mt-2 font-display text-4xl font-semibold text-primary sm:text-5xl">
          Where&apos;s my order?
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
          Enter your order ID and the email you used at checkout. Status updates appear here
          instantly.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="mx-auto mt-8 grid max-w-xl gap-3 rounded-xl border border-gold/30 bg-card p-5 sm:grid-cols-[1fr_1fr_auto]"
      >
        <label className="text-sm font-medium">
          Order ID
          <input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value.toUpperCase())}
            required
            placeholder="DFA-XXXXXX"
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm uppercase"
          />
        </label>
        <label className="text-sm font-medium">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
        </label>
        <button
          disabled={busy}
          className="mt-auto flex items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-60"
        >
          <Search className="h-4 w-4" />
          {busy ? "…" : "Track"}
        </button>
      </form>

      {err && (
        <p role="alert" className="mx-auto mt-4 max-w-xl rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-center text-sm text-destructive">
          {err}
        </p>
      )}

      {order && (
        <div className="mt-8 space-y-5">
          {/* Header card */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-mono text-sm font-semibold">{order.id}</p>
                <p className="text-xs text-muted-foreground">
                  Placed on {new Date(order.placedAt).toLocaleString("en-IN")}
                </p>
              </div>
              <div className="text-right">
                <span
                  className={cn(
                    "inline-block rounded-full px-3 py-1 text-xs font-semibold",
                    order.status === "delivered"
                      ? "bg-green-100 text-green-800"
                      : order.status === "cancelled"
                        ? "bg-destructive/10 text-destructive"
                        : "bg-gold/20 text-cocoa",
                  )}
                >
                  {order.statusLabel}
                </span>
                <p className="mt-1 flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                  <Radio className={cn("h-3 w-3", live ? "animate-pulse text-green-600" : "text-muted-foreground")} />
                  {live ? "Live updates on" : "Refreshing every 10s"}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            {order.status !== "cancelled" && (
              <ol className="mt-6 grid grid-cols-5 gap-1">
                {STEPS.map((s) => {
                  const doneIdx = STEPS.indexOf(order.status as (typeof STEPS)[number]);
                  const idx = STEPS.indexOf(s);
                  const done = idx <= doneIdx;
                  const current = idx === doneIdx;
                  return (
                    <li key={s} className="text-center">
                      <span
                        className={cn(
                          "mx-auto grid h-7 w-7 place-items-center rounded-full border-2 text-xs font-bold",
                          done
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border text-muted-foreground",
                          current && "ring-2 ring-primary ring-offset-2",
                        )}
                      >
                        {done ? "✓" : idx + 1}
                      </span>
                      <p className={cn("mt-1 text-[10px] leading-tight", done ? "font-medium text-foreground" : "text-muted-foreground")}>
                        {s === "placed" ? "Placed" : s === "packed" ? "Packed" : s === "shipped" ? "Shipped" : s === "out-for-delivery" ? "Out for delivery" : "Delivered"}
                      </p>
                    </li>
                  );
                })}
              </ol>
            )}

            <div className="mt-5 grid gap-3 border-t border-border pt-4 text-sm sm:grid-cols-3">
              <p>
                <span className="block text-xs text-muted-foreground">Total</span>
                <b>{inr(order.total)}</b>{" "}
                <span className="text-xs text-muted-foreground">
                  ({order.payment === "cod" ? "Cash on Delivery" : "Paid online"})
                </span>
              </p>
              <p>
                <span className="block text-xs text-muted-foreground">Items</span>
                <b>{order.itemCount}</b>
              </p>
              <p className="flex items-start gap-1.5">
                <MapPin className="mt-0.5 h-3.5 w-3.5 text-gold" />
                <span>
                  <span className="block text-xs text-muted-foreground">Delivering to</span>
                  {order.city} — {order.pin}
                </span>
              </p>
            </div>

            {(order.trackingNumber || order.adminNote) && (
              <div className="mt-4 space-y-2 rounded-lg border border-gold/30 bg-gold/[0.05] p-4 text-sm">
                {order.trackingNumber && (
                  <p className="flex items-center gap-2">
                    <Truck className="h-4 w-4 text-gold" />
                    Tracking number:{" "}
                    {order.trackingUrl ? (
                      <a href={order.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-mono font-semibold text-primary underline">
                        {order.trackingNumber}
                      </a>
                    ) : (
                      <span className="font-mono font-semibold">{order.trackingNumber}</span>
                    )}
                  </p>
                )}
                {order.adminNote && <p className="text-muted-foreground">Note: {order.adminNote}</p>}
              </div>
            )}
          </div>

          {/* Items */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <Package className="h-5 w-5 text-primary" /> Items in this order
            </h2>
            <ul className="mt-3 space-y-2">
              {order.items.map((it, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <img src={it.image} alt="" className="h-11 w-11 rounded-md border border-border object-cover" />
                  <span className="min-w-0 flex-1">
                    {it.name}
                    <span className="block text-xs text-muted-foreground">
                      {it.variant} × {it.qty}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* History */}
          <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <CheckCircle2 className="h-5 w-5 text-primary" /> Status history
            </h2>
            <ol className="mt-3 space-y-3">
              {[...order.history].reverse().map((h, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                  <span>
                    <b>{h.statusLabel}</b>
                    <span className="block text-xs text-muted-foreground">
                      {new Date(h.at).toLocaleString("en-IN")}
                      {h.note ? ` — ${h.note}` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </div>

          <p className="text-center text-sm">
            Need help?{" "}
            <Link href="/contact" className="font-medium text-primary hover:underline">
              Contact support
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}