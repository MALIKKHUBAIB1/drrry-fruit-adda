"use client";

import Link from "next/link";
import { Heart, Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import { inr } from "@/lib/products";
import { useCatalog } from "@/lib/catalog";
import { SHIPPING_FREE_ABOVE, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function CartLines({ compact }: { compact?: boolean }) {
  const { cart, setQty, remove, wishlist, toggleWish } = useStore();
  const { get: getProduct } = useCatalog();
  return (
    <ul className="divide-y divide-border">
      {cart.map((it) => {
        const p = getProduct(it.slug);
        const v = p?.variants.find((x: { label: string }) => x.label === it.variant);
        if (!p || !v) return null;
        const wished = wishlist.includes(p.slug);
        return (
          <li key={it.slug + it.variant} className="flex gap-3 py-4">
            <Link href={`/product/${p.slug}`} className="shrink-0">
              <img
                src={p.image}
                alt={p.name}
                className={
                  compact
                    ? "h-16 w-16 rounded object-cover"
                    : "h-24 w-24 rounded-lg border border-border object-cover"
                }
              />
            </Link>
            <div className="min-w-0 flex-1">
              <Link
                href={`/product/${p.slug}`}
                className="truncate font-display text-lg font-semibold hover:text-primary"
              >
                {p.name}
              </Link>
              <p className="text-xs text-muted-foreground">
                {it.variant} · <span className="line-through">{inr(v.mrp)}</span>
              </p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <div className="flex items-center rounded-md border border-input">
                  <button
                    aria-label="Decrease quantity"
                    onClick={() => setQty(it.slug, it.variant, it.qty - 1)}
                    className="p-1.5 hover:text-primary"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="w-7 text-center text-sm font-medium">{it.qty}</span>
                  <button
                    aria-label="Increase quantity"
                    onClick={() => setQty(it.slug, it.variant, it.qty + 1)}
                    className="p-1.5 hover:text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <span className="font-medium text-primary">{inr(v.price * it.qty)}</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-1">
              <button
                aria-label="Move to wishlist"
                title={wished ? "Saved in wishlist" : "Move to wishlist"}
                onClick={() => toggleWish(it.slug)}
                className={cn("text-muted-foreground hover:text-primary", wished && "text-primary")}
              >
                <Heart className={cn("h-4 w-4", wished && "fill-primary")} />
              </button>
              <button
                aria-label="Remove from cart"
                onClick={() => remove(it.slug, it.variant)}
                className="text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function CartDrawer() {
  const { cartOpen, setCartOpen, cart, subtotal } = useStore();
  if (!cartOpen) return null;
  const left = SHIPPING_FREE_ABOVE - subtotal;
  return (
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-cocoa/60 animate-in fade-in"
        onClick={() => setCartOpen(false)}
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-background shadow-2xl animate-in slide-in-from-right duration-300">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl font-semibold text-primary">Your Cart</h2>
          <button onClick={() => setCartOpen(false)} aria-label="Close cart">
            <X className="h-5 w-5" />
          </button>
        </div>
        {cart.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
            <ShoppingBag className="h-12 w-12 text-gold" />
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Link
              href="/shop"
              onClick={() => setCartOpen(false)}
              className="rounded-md bg-primary px-5 py-2.5 text-sm text-primary-foreground"
            >
              Continue Shopping
            </Link>
          </div>
        ) : (
          <>
            <div className="bg-muted px-5 py-2.5 text-center text-xs text-muted-foreground">
              {left > 0 ? (
                <>
                  Add {inr(left)} more for <b className="text-primary">free shipping</b>
                </>
              ) : (
                <b className="text-primary">You&apos;ve unlocked free shipping!</b>
              )}
            </div>
            <div className="flex-1 overflow-y-auto px-5">
              <CartLines compact />
            </div>
            <div className="space-y-3 border-t border-border p-5">
              <div className="flex justify-between text-lg">
                <span>Subtotal</span>
                <span className="font-semibold text-primary">{inr(subtotal)}</span>
              </div>
              <Link
                href="/checkout"
                onClick={() => setCartOpen(false)}
                className="block rounded-md bg-primary py-3 text-center font-medium text-primary-foreground hover:bg-cocoa"
              >
                Proceed to Checkout
              </Link>
              <Link
                href="/cart"
                onClick={() => setCartOpen(false)}
                className="block text-center text-sm text-primary underline-offset-4 hover:underline"
              >
                View full cart
              </Link>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
