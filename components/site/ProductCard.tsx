"use client";

import Link from "next/link";
import { Heart, Star } from "lucide-react";
import { useState } from "react";
import { inr, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export function ProductCard({ p }: { p: Product }) {
  const { add, wishlist, toggleWish } = useStore();
  const [vi, setVi] = useState(0);
  const v = p.variants[vi];
  const off = v ? Math.round((1 - v.price / v.mrp) * 100) : 0;
  const wished = wishlist.includes(p.slug);

  if (!v) return null;

  return (
    <div className="group flex flex-col overflow-hidden rounded-lg border border-border bg-card transition-shadow hover:shadow-[0_12px_30px_-12px_color-mix(in_oklab,var(--primary)_35%,transparent)]">
      <div className="relative aspect-square overflow-hidden bg-muted">
        <Link href={`/product/${p.slug}`}>
          <img src={p.image} alt={p.name} loading="lazy" width={600} height={600} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
        </Link>
        {p.badge && (
          <span className="absolute left-3 top-3 rounded-sm bg-cocoa px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-gold">{p.badge}</span>
        )}
        <button aria-label="Toggle wishlist" onClick={() => toggleWish(p.slug)} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-card/90 text-primary shadow-sm transition hover:scale-110">
          <Heart className={cn("h-4 w-4", wished && "fill-primary")} />
        </button>
        {!p.inStock && <span className="absolute inset-x-0 bottom-0 bg-cocoa/80 py-1.5 text-center text-xs uppercase tracking-widest text-cocoa-foreground">Sold out</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Star className="h-3.5 w-3.5 fill-gold text-gold" /> {p.rating} <span>({p.reviews})</span>
        </div>
        <Link href={`/product/${p.slug}`} className="font-display text-lg leading-tight font-semibold text-foreground hover:text-primary sm:text-xl">{p.name}</Link>
        <select aria-label="Pack size" value={vi} onChange={(e) => setVi(+e.target.value)} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
          {p.variants.map((x, i) => <option key={x.label} value={i}>{x.label}</option>)}
        </select>
        <div className="mt-auto flex flex-wrap items-baseline gap-2">
          <span className="text-lg font-semibold text-primary">{inr(v.price)}</span>
          <span className="text-sm text-muted-foreground line-through">{inr(v.mrp)}</span>
          {off > 0 && <span className="text-xs font-medium text-accent-foreground">{off}% off</span>}
        </div>
        <button disabled={!p.inStock} onClick={() => add(p.slug, v.label)} className="rounded-md bg-primary py-2 text-sm font-medium tracking-wide text-primary-foreground transition hover:bg-cocoa active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50">
          {p.inStock ? "Add to Cart" : "Out of Stock"}
        </button>
      </div>
    </div>
  );
}
