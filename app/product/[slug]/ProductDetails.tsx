"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Heart, Minus, Plus, Star, Truck } from "lucide-react";
import { useState } from "react";
import { inr, products, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/site/ProductCard";
import { ReviewsSection } from "@/components/site/Reviews";
import { cn } from "@/lib/utils";

export function ProductDetails({ p }: { p: Product }) {
  const { add, wishlist, toggleWish } = useStore();
  const router = useRouter();
  const [vi, setVi] = useState(0);
  const [qty, setQty] = useState(1);
  const [pin, setPin] = useState("");
  const [pinMsg, setPinMsg] = useState("");
  const v = p.variants[vi];
  const related = products.filter((x) => x.slug !== p.slug && (x.group === p.group || x.category === p.category)).slice(0, 4);

  if (!v) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-xs text-muted-foreground"><Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / {p.name}</nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-gold/30 bg-muted">
          <img src={p.image} alt={p.name} width={816} height={816} className="aspect-square w-full object-cover" />
        </div>
        <div>
          {p.badge && <span className="text-xs uppercase tracking-[0.3em] text-gold">{p.badge}</span>}
          <h1 className="mt-2 text-4xl font-semibold text-primary sm:text-5xl">{p.name}</h1>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground"><Star className="h-4 w-4 fill-gold text-gold" /> {p.rating} · {p.reviews} reviews</div>
          <div className="mt-5 flex items-baseline gap-3">
            <span className="text-3xl font-semibold text-primary">{inr(v.price)}</span>
            <span className="text-lg text-muted-foreground line-through">{inr(v.mrp)}</span>
            <span className="rounded bg-gold/20 px-2 py-0.5 text-sm font-medium">{Math.round((1 - v.price / v.mrp) * 100)}% off</span>
          </div>
          <p className="text-xs text-muted-foreground">Inclusive of all taxes</p>

          <p className="mt-6 text-muted-foreground">{p.description}</p>

          <h3 className="mt-6 text-sm font-medium uppercase tracking-widest">Pack size</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {p.variants.map((x, i) => (
              <button key={x.label} onClick={() => setVi(i)} className={cn("rounded-md border px-4 py-2 text-sm transition", i === vi ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-gold")}>{x.label}</button>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-md border border-input">
              <button aria-label="Decrease" onClick={() => setQty((q) => Math.max(1, q - 1))} className="p-3"><Minus className="h-4 w-4" /></button>
              <span className="w-8 text-center">{qty}</span>
              <button aria-label="Increase" onClick={() => setQty((q) => q + 1)} className="p-3"><Plus className="h-4 w-4" /></button>
            </div>
            <button disabled={!p.inStock} onClick={() => add(p.slug, v.label, qty)} className="flex-1 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-50">Add to Cart</button>
            <button aria-label="Wishlist" onClick={() => toggleWish(p.slug)} className="rounded-md border border-input p-3 text-primary"><Heart className={cn("h-5 w-5", wishlist.includes(p.slug) && "fill-primary")} /></button>
          </div>
          <button disabled={!p.inStock} onClick={() => { add(p.slug, v.label, qty); router.push("/checkout"); }} className="mt-3 w-full rounded-md bg-gold py-3 font-medium text-cocoa hover:brightness-105 disabled:opacity-50">Buy Now</button>
          <p className={cn("mt-3 text-sm", p.inStock ? "text-primary" : "text-destructive")}>{p.inStock ? "● In stock" : "● Currently out of stock"}</p>

          <form onSubmit={(e) => { e.preventDefault(); setPinMsg(/^[1-9]\d{5}$/.test(pin) ? "Delivery usually takes 3–7 working days to this PIN code." : "Please enter a valid 6-digit PIN code."); }} className="mt-6 rounded-lg border border-border p-4">
            <p className="flex items-center gap-2 text-sm font-medium"><Truck className="h-4 w-4 text-gold" /> Check delivery</p>
            <div className="mt-2 flex gap-2">
              <input value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" maxLength={6} placeholder="Enter PIN code" className="min-w-0 flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm" />
              <button className="rounded-md border border-primary px-4 text-sm text-primary">Check</button>
            </div>
            {pinMsg && <p className="mt-2 text-xs text-muted-foreground">{pinMsg}</p>}
          </form>

          <ul className="mt-6 space-y-2">
            {p.highlights.map((h) => <li key={h} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-gold" />{h}</li>)}
          </ul>
          <div className="mt-6 space-y-2 text-sm text-muted-foreground">
            <p><b className="text-foreground">Storage:</b> Store in a cool, dry place. Refrigerate after opening for best taste.</p>
            <p><b className="text-foreground">Packaging:</b> Sealed resealable pouch inside a protective outer box.</p>
          </div>
        </div>
      </div>

      <ReviewsSection slug={p.slug} fallbackRating={p.rating} fallbackCount={p.reviews} />

      {related.length > 0 && (
        <section className="mt-20">
          <h2 className="mb-8 text-3xl font-semibold text-primary">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">{related.map((x) => <ProductCard key={x.slug} p={x} />)}</div>
        </section>
      )}
    </div>
  );
}
