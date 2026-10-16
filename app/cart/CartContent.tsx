"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Trash2 } from "lucide-react";
import { useStore } from "@/lib/store";
import { CartLines } from "@/components/site/CartDrawer";
import { FreeShippingBar, Summary } from "@/components/site/CartSummary";

export default function CartContent() {
  const { cart, count, clear, wishlist } = useStore();
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>{" "}
        / <span>Cart</span>
      </nav>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">
          Shopping Cart
        </h1>
        {cart.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {count} item{count === 1 ? "" : "s"}
          </p>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center sm:p-16">
          <ShoppingBag className="mx-auto h-12 w-12 text-gold" />
          <h2 className="mt-4 text-2xl font-semibold">Your cart is empty</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Handpicked almonds, cashews, dates and gift hampers are waiting. Start with our best
            sellers.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link
              href="/shop"
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa"
            >
              Continue Shopping
            </Link>
            <Link
              href="/wishlist"
              className="flex items-center gap-1.5 rounded-md border border-input px-6 py-2.5 text-sm hover:border-gold"
            >
              <Heart className="h-4 w-4" />{" "}
              {wishlist.length > 0 ? `Wishlist (${wishlist.length})` : "View Wishlist"}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-10">
          <div className="space-y-4">
            <FreeShippingBar />
            <div className="rounded-xl border border-border bg-card px-4 sm:px-6">
              <CartLines />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <Link href="/shop" className="text-primary underline-offset-4 hover:underline">
                ← Continue Shopping
              </Link>
              <button
                onClick={clear}
                className="flex items-center gap-1.5 text-muted-foreground hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Clear cart
              </button>
            </div>
          </div>
          <Summary>
            <Link
              href="/checkout"
              className="block rounded-md bg-primary py-3 text-center font-medium text-primary-foreground hover:bg-cocoa"
            >
              Proceed to Checkout →
            </Link>
          </Summary>
        </div>
      )}
    </div>
  );
}
