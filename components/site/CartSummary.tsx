"use client";

import { useEffect, useState } from "react";
import { BadgeCheck, Lock, Ticket, Truck } from "lucide-react";
import { inr } from "@/lib/products";
import { COUPONS, SHIPPING_FREE_ABOVE, useStore } from "@/lib/store";

export function FreeShippingBar({ compact }: { compact?: boolean }) {
  const { subtotal, discount } = useStore();
  const effective = subtotal - discount;
  const left = SHIPPING_FREE_ABOVE - effective;
  const pct = Math.min(100, Math.round((effective / SHIPPING_FREE_ABOVE) * 100));
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-gold/30 bg-gold/10 p-3"
          : "rounded-lg border border-gold/30 bg-gold/10 p-4"
      }
    >
      <p className="flex items-center gap-2 text-sm">
        <Truck className="h-4 w-4 text-primary" />
        {left > 0 ? (
          <span>
            Add <b className="text-primary">{inr(left)}</b> more for <b>free shipping</b>
          </span>
        ) : (
          <span className="font-medium text-primary">You&apos;ve unlocked FREE shipping!</span>
        )}
      </p>
      <div
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-border"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function CouponForm() {
  const { coupon, couponError, applyCoupon, removeCoupon } = useStore();
  const [code, setCode] = useState("");
  const [coupons, setCoupons] = useState<Record<string, { code: string; pct: number; min: number; label: string; status?: string; expiresAt?: string }>>({});

  useEffect(() => {
    fetch("/api/coupons", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => {
        const m: typeof coupons = {};
        (d.coupons ?? []).forEach((c: { code: string; pct: number; min: number; label: string; status?: string; expiresAt?: string }) => { m[c.code] = c; });
        setCoupons(m);
      })
      .catch(() => {});
  }, []);

  if (coupon) {
    return (
      <div className="flex items-center justify-between rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm">
        <span className="flex items-center gap-2 font-medium text-primary">
          <Ticket className="h-4 w-4" />
          {coupon} applied
        </span>
        <button
          onClick={removeCoupon}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          Remove
        </button>
      </div>
    );
  }

  const expired = Object.values(coupons).filter((c) => c.status === "expired");
  const active = Object.values(coupons).filter((c) => c.status === "active");

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (applyCoupon(code)) setCode("");
        }}
        className="flex gap-2"
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Discount code (try WELCOME10)"
          aria-label="Discount code"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm uppercase placeholder:normal-case"
        />
        <button className="rounded-md border border-primary px-3 text-sm font-medium text-primary hover:bg-primary hover:text-primary-foreground">
          Apply
        </button>
      </form>
      {couponError && (
        <p role="alert" className="mt-1.5 text-xs text-destructive">
          {couponError}
        </p>
      )}

      {/* Active coupons */}
      {active.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {active.map((c) => (
            <button
              key={c.code}
              title={c.label}
              onClick={() => {
                if (applyCoupon(c.code)) setCode("");
              }}
              className="rounded-full border border-dashed border-gold px-2.5 py-1 text-[11px] font-medium text-primary hover:bg-gold/10"
            >
              {c.code} · {c.pct}% off
            </button>
          ))}
        </div>
      )}

      {/* Expired coupons — top level banner */}
      {expired.length > 0 && (
        <div className="mt-3 rounded-lg border border-destructive/30 bg-destructive/[0.06] p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-destructive">
            Expired coupons
          </p>
          <ul className="mt-1.5 space-y-1">
            {expired.map((c) => (
              <li key={c.code} className="flex items-center justify-between text-xs">
                <span className="font-mono font-medium text-foreground/70 line-through">{c.code}</span>
                <span className="text-destructive">
                  Expired{c.expiresAt ? ` on ${new Date(c.expiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export function Summary({
  children,
  showCoupon = true,
}: {
  children?: React.ReactNode;
  showCoupon?: boolean;
}) {
  const { subtotal, mrpTotal, savings, discount, shipping, coupon } = useStore();
  return (
    <div className="h-fit space-y-3 rounded-xl border border-gold/30 bg-card p-6 shadow-sm lg:sticky lg:top-32">
      <h2 className="font-display text-2xl font-semibold">Order Summary</h2>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Subtotal (MRP)</span>
        <span className="line-through">{inr(mrpTotal)}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Sale subtotal</span>
        <span>{inr(subtotal)}</span>
      </div>
      {savings > 0 && (
        <div className="flex justify-between text-sm font-medium text-primary">
          <span>Sale savings</span>
          <span>− {inr(savings)}</span>
        </div>
      )}
      {discount > 0 && (
        <div className="flex justify-between text-sm font-medium text-primary">
          <span>Coupon {coupon}</span>
          <span>− {inr(discount)}</span>
        </div>
      )}
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Shipping</span>
        <span>{shipping === 0 ? <b className="text-primary">Free</b> : inr(shipping)}</span>
      </div>
      <div className="flex justify-between border-t border-border pt-3 text-lg font-semibold">
        <span>Total</span>
        <span className="text-primary">{inr(subtotal - discount + shipping)}</span>
      </div>
      {showCoupon && (
        <div className="pt-1">
          <CouponForm />
        </div>
      )}
      {children}
      <ul className="space-y-1.5 pt-2 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-gold" /> Secure checkout · COD & UPI available
        </li>
        <li className="flex items-center gap-1.5">
          <BadgeCheck className="h-3.5 w-3.5 text-gold" /> Hand-sorted quality checked packs
        </li>
        <li className="flex items-center gap-1.5">
          <Truck className="h-3.5 w-3.5 text-gold" /> Free shipping over {inr(SHIPPING_FREE_ABOVE)}
        </li>
      </ul>
    </div>
  );
}
