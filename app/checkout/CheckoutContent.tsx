"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Banknote, CheckCircle2, Lock, QrCode, ShoppingBag } from "lucide-react";
import { getProduct, inr } from "@/lib/products";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { FreeShippingBar, Summary } from "@/components/site/CartSummary";
import { cn } from "@/lib/utils";
import { openRazorpayCheckout } from "@/lib/razorpay";

const field =
  "w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-gold";
const errText = "mt-1 text-xs text-destructive";

type Form = {
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  notes: string;
};

const initial: Form = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pin: "",
  notes: "",
};

function validate(f: Form) {
  const e: Partial<Record<keyof Form, string>> = {};
  if (f.name.trim().length < 3) e.name = "Enter your full name.";
  if (!/^[6-9]\d{9}$/.test(f.phone.trim())) e.phone = "Enter a valid 10-digit mobile number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = "Enter a valid email address.";
  if (f.address.trim().length < 10) e.address = "Enter your full street address.";
  if (!f.city.trim()) e.city = "Required.";
  if (!f.state.trim()) e.state = "Required.";
  if (!/^[1-9]\d{5}$/.test(f.pin.trim())) e.pin = "Enter a valid 6-digit PIN code.";
  return e;
}

function Steps({ step }: { step: number }) {
  const labels = ["Cart", "Details", "Done"];
  return (
    <ol className="flex items-center gap-2 text-xs sm:text-sm" aria-label="Checkout steps">
      {labels.map((l, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <li key={l} className="flex items-center gap-2">
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border font-medium",
                done
                  ? "border-primary bg-primary text-primary-foreground"
                  : active
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground",
              )}
            >
              {done ? "✓" : n}
            </span>
            <span
              className={active || done ? "font-medium text-foreground" : "text-muted-foreground"}
            >
              {l}
            </span>
            {n < labels.length && <span className="mx-1 h-px w-6 bg-border sm:w-10" />}
          </li>
        );
      })}
    </ol>
  );
}

export default function CheckoutContent() {
  const { cart, clear, subtotal, discount, shipping, total, coupon } = useStore();
  const { user } = useAuth();
  const [pay, setPay] = useState("cod");
  const [form, setForm] = useState<Form>(initial);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [orderId, setOrderId] = useState<string | null>(null);
  const [placing, setPlacing] = useState(false);
  const [placeError, setPlaceError] = useState<string | null>(null);
  const [placedAt, setPlacedAt] = useState<{
    total: number;
    count: number;
    pay: string;
    city: string;
    pin: string;
  } | null>(null);
  const [saved, setSaved] = useState<
    { id: string; label: string; name: string; phone: string; address: string; city: string; state: string; pin: string; isDefault: boolean }[]
  >([]);
  const [saveAddress, setSaveAddress] = useState(true);
  const [pinInfo, setPinInfo] = useState<{
    city: string; state: string; district: string; zone: string;
    shipping: number; serviceable: boolean; codAvailable: boolean;
  } | null>(null);
  const [pinErr, setPinErr] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  const checkPin = async (pin: string) => {
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setPinInfo(null);
      setPinErr(null);
      return;
    }
    setPinLoading(true);
    setPinErr(null);
    try {
      const res = await fetch(`/api/pincode?pin=${pin}`);
      const d = await res.json();
      if (!res.ok) {
        setPinInfo(null);
        setPinErr(d.error || "PIN code not serviceable.");
        return;
      }
      setPinInfo({
        city: d.city, state: d.state, district: d.district,
        zone: d.zone, shipping: d.shipping,
        serviceable: d.serviceable, codAvailable: d.codAvailable,
      });
      // City/state auto-fill (user ne manually change nahi kiya ho)
      setForm((f) => ({ ...f, city: d.city || f.city, state: d.state || f.state }));
      setErrors((prev) => ({ ...prev, city: undefined, state: undefined, pin: undefined }));
    } catch {
      setPinInfo(null);
      setPinErr("Couldn't verify PIN. Please try again.");
    } finally {
      setPinLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setForm((f) => ({
        ...f,
        name: f.name || user.name,
        email: f.email || user.email,
      }));
      fetch("/api/addresses", { credentials: "include" })
        .then((r) => r.json())
        .then((d) => {
          if (d.addresses?.length) {
            setSaved(d.addresses);
            const def = d.addresses.find((a: { isDefault: boolean }) => a.isDefault) ?? d.addresses[0];
            setForm((f) => ({
              ...f,
              name: f.name || def.name,
              phone: f.phone || def.phone,
              address: f.address || def.address,
              city: f.city || def.city,
              state: f.state || def.state,
              pin: f.pin || def.pin,
            }));
          }
        })
        .catch(() => {});
    }
  }, [user]);

  const useSaved = (id: string) => {
    const a = saved.find((x) => x.id === id);
    if (!a) return;
    setForm((f) => ({
      ...f,
      name: a.name,
      phone: a.phone,
      address: a.address,
      city: a.city,
      state: a.state,
      pin: a.pin,
    }));
    setErrors({});
  };

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((prev) => ({ ...prev, [k]: undefined }));
  };

  if (orderId && placedAt) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center sm:py-24">
        <CheckCircle2 className="mx-auto h-16 w-16 text-primary" />
        <h1 className="mt-4 font-display text-4xl font-semibold text-primary">Order placed!</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Thank you {form.name.split(" ")[0] || "friend"} — your order{" "}
          <b className="text-foreground">{orderId}</b> is confirmed.
          {pay === "cod"
            ? " Keep cash/UPI ready for delivery."
            : " Payment received — confirmation sent to your email."}
        </p>
        <div className="mt-6 rounded-xl border border-gold/30 bg-card p-5 text-left text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Items</span>
            <span>{placedAt.count}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Deliver to</span>
            <span>
              {placedAt.city} {placedAt.pin}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Payment</span>
            <span>{placedAt.pay === "cod" ? "Cash on Delivery" : "Paid online (Razorpay)"}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-semibold">
            <span>Total</span>
            <span className="text-primary">{inr(placedAt.total)}</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Estimated delivery: 3–7 working days. A confirmation has been sent to {form.email}.
          </p>
        </div>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            href="/shop"
            className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa"
          >
            Continue Shopping
          </Link>
          <Link
            href="/wishlist"
            className="rounded-md border border-input px-6 py-2.5 text-sm hover:border-gold"
          >
            View Wishlist
          </Link>
        </div>
      </div>
    );
  }

  if (cart.length === 0)
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-gold" />
        <h1 className="mt-4 text-4xl font-semibold text-primary">Nothing to check out yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your cart is empty — add some festive favourites first.
        </p>
        <Link
          href="/shop"
          className="mt-6 inline-block rounded-md bg-primary px-6 py-2.5 text-primary-foreground"
        >
          Start Shopping
        </Link>
      </div>
    );

  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center sm:py-24">
        <Lock className="mx-auto h-12 w-12 text-gold" />
        <h1 className="mt-4 font-display text-4xl font-semibold text-primary">Login required</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Please login or create an account to place your order. Your cart is saved and will be
          waiting for you.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <Link
            href="/login?redirect=/checkout"
            className="rounded-full bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-cocoa"
          >
            Login to continue
          </Link>
          <Link
            href="/register?redirect=/checkout"
            className="rounded-full border border-black/10 py-3 text-sm font-medium hover:border-primary hover:text-primary"
          >
            Create an account
          </Link>
        </div>
      </div>
    );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>{" "}
        /{" "}
        <Link href="/cart" className="hover:text-primary">
          Cart
        </Link>{" "}
        / <span>Checkout</span>
      </nav>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">Checkout</h1>
        <Steps step={2} />
      </div>
      <p className="mt-4 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm">
        Ordering as <b>{user.name}</b> ({user.email}) —{" "}
        <Link href="/account" className="font-medium text-primary hover:underline">
          Account
        </Link>
      </p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-10">
        <form
          noValidate
          onSubmit={async (e) => {
            e.preventDefault();
            const errs = validate(form);
            setErrors(errs);
            if (Object.keys(errs).length > 0) {
              document
                .querySelector('[aria-invalid="true"]')
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
              return;
            }
            setPlacing(true);
            setPlaceError(null);
            try {
              const isOnline = pay === "online";

              // 1) Online payment: pehle Razorpay order banao
              let rzp: { keyId: string; orderId: string; amount: number; currency: string } | null = null;
              if (isOnline) {
                const r = await fetch("/api/payments/create-order", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    amount: Math.round(total * 100),
                    receipt: `DFA-${Date.now().toString(36).toUpperCase()}`,
                  }),
                });
                const d = await r.json().catch(() => ({}));
                if (!r.ok) throw new Error(d.error || "Couldn't start payment.");
                rzp = d;
              }

              // 2) Razorpay popup open karo (online only)
              let paymentResult: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string } | null = null;
              if (isOnline && rzp) {
                paymentResult = await openRazorpayCheckout({
                  keyId: rzp.keyId,
                  orderId: rzp.orderId,
                  amount: rzp.amount,
                  currency: rzp.currency,
                  name: form.name,
                  email: form.email,
                  phone: form.phone,
                  description: "Dryfruit Adda order",
                });
              }

              // 3) DB order create karo
              const res = await fetch("/api/orders", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  items: cart.map((x) => ({ slug: x.slug, variant: x.variant, qty: x.qty })),
                  coupon,
                  name: form.name,
                  phone: form.phone,
                  email: form.email,
                  address: form.address,
                  city: form.city,
                  state: form.state,
                  pin: form.pin,
                  notes: form.notes,
                  payment: pay,
                }),
              });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error || "Order place nahi ho paya.");
              const order = data.order;

              // 4) Online: signature verify + paid mark
              if (isOnline && rzp && paymentResult) {
                const v = await fetch("/api/payments/verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    ...paymentResult,
                    orderId: order.id,
                  }),
                });
                const vd = await v.json().catch(() => ({}));
                if (!v.ok) throw new Error(vd.error || "Payment verification failed.");
              }

              // Address book save
              if (saveAddress && !saved.some((a) => a.address === form.address && a.pin === form.pin)) {
                fetch("/api/addresses", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify({
                    label: "Home",
                    name: form.name,
                    phone: form.phone,
                    address: form.address,
                    city: form.city,
                    state: form.state,
                    pin: form.pin,
                  }),
                }).catch(() => {});
              }

              setPlacedAt({
                total: order.total,
                count: order.items.reduce((s: number, x: { qty: number }) => s + x.qty, 0),
                pay: order.payment,
                city: order.city,
                pin: order.pin,
              });
              setOrderId(order.id);
              clear();
            } catch (err) {
              setPlaceError(err instanceof Error ? err.message : "Order place nahi ho paya.");
            } finally {
              setPlacing(false);
            }
          }}
          className="space-y-6"
        >
          {saved.length > 0 && (
            <div className="rounded-xl border border-gold/30 bg-gold/[0.04] p-5">
              <p className="text-sm font-medium">Saved addresses</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {saved.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => useSaved(a.id)}
                    className="rounded-md border border-input bg-background px-3 py-2 text-left text-xs hover:border-gold"
                  >
                    <span className="font-medium">{a.label}</span>
                    <span className="block text-muted-foreground">
                      {a.name} · {a.city} {a.pin}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          <fieldset className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-2 sm:p-6">
            <legend className="px-1 text-xl font-semibold">Contact</legend>
            <label className="text-sm">
              Full name
              <input
                value={form.name}
                onChange={set("name")}
                required
                aria-invalid={!!errors.name}
                autoComplete="name"
                placeholder="Aarav Sharma"
                className={field}
              />
              {errors.name && <p className={errText}>{errors.name}</p>}
            </label>
            <label className="text-sm">
              Phone
              <input
                value={form.phone}
                onChange={set("phone")}
                required
                inputMode="numeric"
                maxLength={10}
                aria-invalid={!!errors.phone}
                autoComplete="tel"
                placeholder="98765 43210"
                className={field}
              />
              {errors.phone && <p className={errText}>{errors.phone}</p>}
            </label>
            <label className="text-sm sm:col-span-2">
              Email
              <input
                value={form.email}
                onChange={set("email")}
                required
                type="email"
                aria-invalid={!!errors.email}
                autoComplete="email"
                placeholder="you@example.com"
                className={field}
              />
              {errors.email && <p className={errText}>{errors.email}</p>}
            </label>
          </fieldset>

          <fieldset className="grid gap-4 rounded-xl border border-border bg-card p-5 sm:grid-cols-3 sm:p-6">
            <legend className="px-1 text-xl font-semibold">Shipping address</legend>
            <label className="text-sm sm:col-span-3">
              Address
              <textarea
                value={form.address}
                onChange={set("address")}
                required
                rows={2}
                aria-invalid={!!errors.address}
                autoComplete="street-address"
                placeholder="Flat / House no, Street, Landmark"
                className={field}
              />
              {errors.address && <p className={errText}>{errors.address}</p>}
            </label>
            <label className="text-sm">
              City
              <input
                value={form.city}
                onChange={set("city")}
                required
                aria-invalid={!!errors.city}
                autoComplete="address-level2"
                className={field}
              />
              {errors.city && <p className={errText}>{errors.city}</p>}
            </label>
            <label className="text-sm">
              State
              <input
                value={form.state}
                onChange={set("state")}
                required
                aria-invalid={!!errors.state}
                autoComplete="address-level1"
                className={field}
              />
              {errors.state && <p className={errText}>{errors.state}</p>}
            </label>
            <label className="text-sm">
              PIN code
              <input
                value={form.pin}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                  set("pin")({ target: { value: v } } as React.ChangeEvent<HTMLInputElement>);
                  if (v.length === 6) checkPin(v);
                  else { setPinInfo(null); setPinErr(null); }
                }}
                required
                inputMode="numeric"
                maxLength={6}
                aria-invalid={!!errors.pin}
                autoComplete="postal-code"
                placeholder="110001"
                className={field}
              />
              {errors.pin && <p className={errText}>{errors.pin}</p>}
              {pinLoading && <p className="mt-1 text-xs text-muted-foreground">Checking PIN code…</p>}
              {pinErr && <p className="mt-1 text-xs text-destructive">{pinErr}</p>}
              {pinInfo && (
                <p className="mt-1 text-xs text-primary">
                  {pinInfo.city}{pinInfo.district ? `, ${pinInfo.district}` : ""}, {pinInfo.state}
                  {pinInfo.serviceable
                    ? ` · Delivery charge ${pinInfo.shipping === 0 ? "FREE" : `₹${pinInfo.shipping}`}`
                    : " · Not serviceable"}
                  {!pinInfo.codAvailable && " · COD unavailable"}
                </p>
              )}
            </label>
            <label className="text-sm sm:col-span-3">
              Delivery instructions (optional)
              <input
                value={form.notes}
                onChange={set("notes")}
                placeholder="e.g. Call on arrival, leave with guard"
                className={field}
              />
            </label>
            <label className="flex items-center gap-2 text-sm sm:col-span-3">
              <input
                type="checkbox"
                checked={saveAddress}
                onChange={(e) => setSaveAddress(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              Save this address to my address book
            </label>
          </fieldset>

          <fieldset className="rounded-xl border border-border bg-card p-5 sm:p-6">
            <legend className="px-1 text-xl font-semibold">Payment</legend>
            {(
              [
                {
                  k: "cod",
                  l: "Cash on Delivery",
                  d: "Pay by cash or UPI when your order arrives.",
                  Icon: Banknote,
                },
                {
                  k: "online",
                  l: "UPI / Card / Netbanking (Razorpay)",
                  d: "Pay securely now via UPI, card or netbanking.",
                  Icon: QrCode,
                },
              ] as const
            ).map(({ k, l, d, Icon }) => (
              <label
                key={k}
                className={cn(
                  "mb-2 flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition",
                  pay === k ? "border-primary bg-primary/5" : "border-input hover:border-gold",
                )}
              >
                <input
                  type="radio"
                  name="pay"
                  checked={pay === k}
                  onChange={() => setPay(k)}
                  className="accent-[var(--primary)]"
                />
                <Icon className="h-5 w-5 text-gold" />
                <span>
                  <span className="block text-sm font-medium">{l}</span>
                  <span className="block text-xs text-muted-foreground">{d}</span>
                </span>
              </label>
            ))}
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Payments are encrypted by Razorpay. Demo keys use test
              mode.
            </p>
          </fieldset>

          <button disabled={placing} className="w-full rounded-md bg-primary py-3.5 font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-60">
            {placing ? "Processing…" : `Place Order · ${inr(total)}`}
          </button>
          {placeError && (
            <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-center text-sm text-destructive">
              {placeError}
            </p>
          )}
        </form>

        <div className="space-y-4">
          <FreeShippingBar compact />
          <Summary>
            <ul className="divide-y divide-border rounded-md border border-border">
              {cart.map((it) => {
                const p = getProduct(it.slug);
                const v = p?.variants.find((x) => x.label === it.variant);
                if (!p || !v) return null;
                return (
                  <li
                    key={it.slug + it.variant}
                    className="flex items-center gap-2.5 p-2.5 text-sm"
                  >
                    <span className="relative shrink-0">
                      <img
                        src={p.image}
                        alt=""
                        className="h-11 w-11 rounded-md border border-border object-cover"
                      />
                      <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-cocoa px-1 text-[10px] font-bold text-gold">
                        {it.qty}
                      </span>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">{it.variant}</span>
                    </span>
                    <span className="font-medium">{inr(v.price * it.qty)}</span>
                  </li>
                );
              })}
            </ul>
            {discount > 0 && (
              <p className="text-xs font-medium text-primary">
                Coupon {coupon} saved you {inr(discount)} — nice!
              </p>
            )}
            <p className="-mt-1 text-xs text-muted-foreground">
              Subtotal {inr(subtotal)} · Shipping {shipping === 0 ? "Free" : inr(shipping)} · Total{" "}
              {inr(total)}
            </p>
          </Summary>
        </div>
      </div>
    </div>
  );
}
