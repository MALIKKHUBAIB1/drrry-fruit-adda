"use client";

import Link from "next/link";
import { Heart, ShoppingBag, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getProduct, inr, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";

export default function WishlistContent() {
  const { wishlist, removeWish, clearWishlist, add } = useStore();
  const items = wishlist
    .map((slug) => getProduct(slug))
    .filter((p): p is Product => p !== undefined);

  const moveAllToCart = () => {
    items.forEach((p) => {
      const v = p.variants[0];
      if (p.inStock && v) add(p.slug, v.label, 1);
    });
    if (items.some((p) => p.inStock)) toast.success("Wishlist moved to cart");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
      <nav className="text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">
          Home
        </Link>{" "}
        / <span>Wishlist</span>
      </nav>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-semibold text-primary sm:text-5xl">
            Your Wishlist
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {items.length === 0
              ? "Save your favourites here for later."
              : `${items.length} saved item${items.length === 1 ? "" : "s"}`}
          </p>
        </div>
        {items.length > 0 && (
          <div className="flex gap-2">
            <button
              onClick={moveAllToCart}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-cocoa"
            >
              <ShoppingBag className="h-4 w-4" /> Move all to cart
            </button>
            <button
              onClick={clearWishlist}
              className="flex items-center gap-1.5 rounded-md border border-input px-4 py-2 text-sm text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" /> Clear
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border p-10 text-center sm:p-16">
          <Heart className="mx-auto h-12 w-12 text-gold" />
          <h2 className="mt-4 text-2xl font-semibold">Nothing saved yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Tap the heart on any product to save it here — perfect for festive gifting lists.
          </p>
          <Link
            href="/shop"
            className="mt-6 inline-block rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa"
          >
            Discover Best Sellers
          </Link>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => {
            const v = p.variants[0];
            if (!v) return null;
            const off = Math.round((1 - v.price / v.mrp) * 100);
            return (
              <li
                key={p.slug}
                className="flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-shadow hover:shadow-lg"
              >
                <Link
                  href={`/product/${p.slug}`}
                  className="relative aspect-[4/3] overflow-hidden bg-muted"
                >
                  <img
                    src={p.image}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                  />
                  {p.badge && (
                    <span className="absolute left-3 top-3 rounded-sm bg-cocoa px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-gold">
                      {p.badge}
                    </span>
                  )}
                </Link>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="h-3.5 w-3.5 fill-gold text-gold" /> {p.rating}{" "}
                    <span>({p.reviews})</span>
                  </div>
                  <Link
                    href={`/product/${p.slug}`}
                    className="font-display text-xl font-semibold leading-tight hover:text-primary"
                  >
                    {p.name}
                  </Link>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-semibold text-primary">{inr(v.price)}</span>
                    <span className="text-sm text-muted-foreground line-through">{inr(v.mrp)}</span>
                    {off > 0 && <span className="text-xs font-medium">{off}% off</span>}
                  </div>
                  <p className={`text-xs ${p.inStock ? "text-primary" : "text-destructive"}`}>
                    {p.inStock ? "● In stock" : "● Out of stock"}
                  </p>
                  <div className="mt-auto flex gap-2 pt-2">
                    <button
                      disabled={!p.inStock}
                      onClick={() => add(p.slug, v.label, 1)}
                      className="flex-1 rounded-md bg-primary py-2 text-sm font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-50"
                    >
                      Move to Cart
                    </button>
                    <button
                      aria-label={`Remove ${p.name} from wishlist`}
                      onClick={() => removeWish(p.slug)}
                      className="rounded-md border border-input px-3 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
