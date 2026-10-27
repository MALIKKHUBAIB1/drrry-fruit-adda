"use client";

import { createContext, useContext, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { useCatalog } from "./catalog";

export type CartItem = { slug: string; variant: string; qty: number };

import { api } from "./api";

export type Coupon = { code: string; pct: number; min: number; label: string; expiresAt?: string; status?: string };

export const COUPONS: Record<string, Coupon> = {
  WELCOME10: { code: "WELCOME10", pct: 10, min: 499, label: "10% off on orders above ₹499" },
  DRYFRUIT20: { code: "DRYFRUIT20", pct: 20, min: 1499, label: "20% off on orders above ₹1,499" },
};

// Coupons backend se load hote hain (expiry/status ke saath)
let _couponsLoaded = false;
export async function loadCoupons(): Promise<void> {
  if (_couponsLoaded) return;
  try {
    const d = await api<{ coupons: Coupon[] }>("/api/coupons");
    if (d.coupons?.length) {
      Object.keys(COUPONS).forEach((k) => delete COUPONS[k]);
      d.coupons.forEach((c) => { COUPONS[c.code] = c; });
    }
    _couponsLoaded = true;
  } catch {
    // fallback static rehne do
  }
}

type Store = {
  cart: CartItem[];
  wishlist: string[];
  cartOpen: boolean;
  coupon: string | null;
  couponError: string | null;
  synced: boolean;
  setCartOpen: (o: boolean) => void;
  add: (slug: string, variant: string, qty?: number, openDrawer?: boolean) => void;
  setQty: (slug: string, variant: string, qty: number) => void;
  remove: (slug: string, variant: string) => void;
  clear: () => void;
  toggleWish: (slug: string) => void;
  removeWish: (slug: string) => void;
  clearWishlist: () => void;
  applyCoupon: (code: string) => boolean;
  removeCoupon: () => void;
  count: number;
  subtotal: number;
  mrpTotal: number;
  savings: number;
  discount: number;
  shipping: number;
  total: number;
};

const Ctx = createContext<Store | null>(null);

async function fetchJson(path: string, init?: RequestInit) {
  const res = await fetch(path, { credentials: "include", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || "Request failed");
  return data;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const { get: getProduct } = useCatalog();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [coupon, setCoupon] = useState<string | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [synced, setSynced] = useState(false);
  const syncTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Coupons backend se load (expiry/status)
  useEffect(() => {
    loadCoupons();
  }, []);

  // 1) Guest data localStorage se load
  useEffect(() => {
    try {
      setCart(JSON.parse(localStorage.getItem("dfa-cart") || "[]"));
      setWishlist(JSON.parse(localStorage.getItem("dfa-wish") || "[]"));
      setCoupon(JSON.parse(localStorage.getItem("dfa-coupon") || "null"));
    } catch {}
    setReady(true);
  }, []);

  // 2) Backend se cart/wishlist pull + merge
  const pullFromBackend = useCallback(async () => {
    try {
      const me = await fetchJson("/api/auth/me").catch(() => null);
      if (!me) {
        setLoggedIn(false);
        setSynced(true);
        return;
      }
      setLoggedIn(true);
      const [c, w] = await Promise.all([
        fetchJson("/api/cart").catch(() => ({ items: [] })),
        fetchJson("/api/wishlist").catch(() => ({ items: [] })),
      ]);
      const serverCart: CartItem[] = c.items ?? [];
      const serverWish: string[] = w.items ?? [];
      // Merge: local guest items + server items (qty add)
      setCart((local) => {
        if (local.length === 0 && serverCart.length > 0) return serverCart;
        if (serverCart.length === 0 && local.length > 0) {
          // guest cart ko server par push karo
          fetchJson("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: local }) }).catch(() => {});
          return local;
        }
        if (local.length === 0 && serverCart.length === 0) return local;
        const merged = [...serverCart];
        for (const it of local) {
          const i = merged.findIndex((x) => x.slug === it.slug && x.variant === it.variant);
          if (i >= 0) merged[i] = { ...merged[i], qty: Math.min(20, merged[i].qty + it.qty) };
          else merged.push(it);
        }
        if (JSON.stringify(merged) !== JSON.stringify(serverCart)) {
          fetchJson("/api/cart", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: merged }) }).catch(() => {});
        }
        return merged;
      });
      setWishlist((local) => {
        const merged = Array.from(new Set([...serverWish, ...local]));
        if (JSON.stringify(merged) !== JSON.stringify(serverWish)) {
          fetchJson("/api/wishlist", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: merged }) }).catch(() => {});
        }
        return merged;
      });
    } catch {
      // backend down ho to guest mode me chalne do
    } finally {
      setSynced(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    pullFromBackend();
    const onAuth = () => {
      // logout par guest cart rakho, login par merge karo
      pullFromBackend();
    };
    window.addEventListener("dfa-auth", onAuth);
    return () => window.removeEventListener("dfa-auth", onAuth);
  }, [ready, pullFromBackend]);

  // 3) Local persist + backend push (debounced, sirf login par)
  useEffect(() => {
    if (ready) localStorage.setItem("dfa-cart", JSON.stringify(cart));
    if (!ready || !synced || !loggedIn) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetchJson("/api/cart", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cart }),
      }).catch(() => {});
    }, 600);
  }, [cart, ready, synced, loggedIn]);

  useEffect(() => {
    if (ready) localStorage.setItem("dfa-wish", JSON.stringify(wishlist));
    if (!ready || !synced || !loggedIn) return;
    if (syncTimer.current) clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(() => {
      fetchJson("/api/wishlist", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: wishlist }),
      }).catch(() => {});
    }, 600);
  }, [wishlist, ready, synced, loggedIn]);

  useEffect(() => {
    if (ready) localStorage.setItem("dfa-coupon", JSON.stringify(coupon));
  }, [coupon, ready]);

  // openDrawer: default false — Zomato/BigBasket style instant add.
  // Cart drawer sirf tab khule jab user explicitly maange (e.g. product page se).
  const add = (slug: string, variant: string, qty = 1, openDrawer = false) => {
    setCart((c) => {
      const i = c.findIndex((x) => x.slug === slug && x.variant === variant);
      if (i >= 0) return c.map((x, j) => (j === i ? { ...x, qty: x.qty + qty } : x));
      return [...c, { slug, variant, qty }];
    });
    const name = getProduct(slug)?.name ?? "Item";
    toast.success(`${name} added to cart`, {
      description: qty > 1 ? `Qty ${qty} · ${variant}` : variant,
      action: {
        label: "View cart",
        onClick: () => setCartOpen(true),
      },
    });
    if (openDrawer) setCartOpen(true);
  };
  const setQty = (slug: string, variant: string, qty: number) =>
    setCart((c) =>
      c.map((x) =>
        x.slug === slug && x.variant === variant ? { ...x, qty: Math.max(1, qty) } : x,
      ),
    );
  const remove = (slug: string, variant: string) =>
    setCart((c) => c.filter((x) => !(x.slug === slug && x.variant === variant)));
  const toggleWish = (slug: string) =>
    setWishlist((w) => (w.includes(slug) ? w.filter((s) => s !== slug) : [...w, slug]));
  const removeWish = (slug: string) => setWishlist((w) => w.filter((s) => s !== slug));
  const clearWishlist = () => setWishlist([]);

  const count = cart.reduce((s, x) => s + x.qty, 0);
  const subtotal = cart.reduce((s, x) => {
    const v = getProduct(x.slug)?.variants.find((v) => v.label === x.variant);
    return s + (v ? v.price * x.qty : 0);
  }, 0);
  const mrpTotal = cart.reduce((s, x) => {
    const v = getProduct(x.slug)?.variants.find((v) => v.label === x.variant);
    return s + (v ? v.mrp * x.qty : 0);
  }, 0);
  const savings = Math.max(0, mrpTotal - subtotal);

  const activeCoupon = coupon ? COUPONS[coupon] : undefined;
  const discount =
    activeCoupon && subtotal >= activeCoupon.min
      ? Math.round((subtotal * activeCoupon.pct) / 100)
      : 0;
  const shipping = shippingFor(subtotal - discount);
  const total = subtotal - discount + shipping;

  const applyCoupon = (code: string) => {
    const c = COUPONS[code.trim().toUpperCase()];
    if (!c) {
      setCouponError("This discount code isn't valid.");
      return false;
    }
    if (subtotal < c.min) {
      setCouponError(
        `Add items worth ${c.min.toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })} to use ${c.code}.`,
      );
      return false;
    }
    setCoupon(c.code);
    setCouponError(null);
    toast.success(`${c.code} applied — ${c.pct}% off!`);
    return true;
  };
  const removeCoupon = () => {
    setCoupon(null);
    setCouponError(null);
  };

  // Auto-drop coupon if cart falls below its minimum.
  useEffect(() => {
    if (coupon && activeCoupon && subtotal < activeCoupon.min) setCoupon(null);
  }, [subtotal, coupon]);

  const clear = () => {
    setCart([]);
    setCoupon(null);
    setCouponError(null);
    if (loggedIn) fetchJson("/api/cart", { method: "DELETE" }).catch(() => {});
  };

  return (
    <Ctx.Provider
      value={{
        cart,
        wishlist,
        cartOpen,
        coupon,
        couponError,
        synced,
        setCartOpen,
        add,
        setQty,
        remove,
        clear,
        toggleWish,
        removeWish,
        clearWishlist,
        applyCoupon,
        removeCoupon,
        count,
        subtotal,
        mrpTotal,
        savings,
        discount,
        shipping,
        total,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useStore = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore outside provider");
  return c;
};

export const SHIPPING_FREE_ABOVE = 999;
// Cart par exact charge nahi pata hota (PIN zone + delivery speed decide karta hai),
// isliye yahan sirf free-shipping threshold ka estimate dikhaya jaata hai.
// Asli charge checkout par pincode ke hisaab se lagta hai.
export const shippingFor = (subtotal: number) =>
  subtotal === 0 || subtotal >= SHIPPING_FREE_ABOVE ? 0 : 79;
