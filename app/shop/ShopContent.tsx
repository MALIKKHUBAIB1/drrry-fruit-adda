"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { categories as fallbackCategories, groups as fallbackGroups, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/site/ProductCard";

const PAGE = 8;

export default function ShopContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { wishlist } = useStore();
  const [maxPrice, setMaxPrice] = useState(2500);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [shown, setShown] = useState(PAGE);
  const [drawer, setDrawer] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState(fallbackCategories);
  const [groups, setGroups] = useState<Record<string, string>>(fallbackGroups);
  const [loading, setLoading] = useState(true);

  const q = searchParams.get("q") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const group = searchParams.get("group") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;

  // Catalogue backend se — filters/sort server-side hote hain.
  useEffect(() => {
    let alive = true;
    setLoading(true);
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (category) sp.set("category", category);
    if (group) sp.set("group", group);
    if (sort) sp.set("sort", sort);
    fetch(`/api/products?${sp.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        setProducts(d.products ?? []);
        if (d.categories?.length) setCategories(d.categories);
      })
      .catch(() => {})
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const set = (patch: Record<string, string | undefined>) => {
    setShown(PAGE);
    const next = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined) next.delete(k);
      else next.set(k, v);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };
  const clearSearch = () => router.push(pathname);

  const list = useMemo(() => {
    // Price + stock filters client-side (slider instant rahe)
    return products.filter(
      (p) =>
        (!inStockOnly || p.inStock) &&
        (p.variants[0] ? p.variants[0].price <= maxPrice : true),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, wishlist, inStockOnly, maxPrice]);

  const title = category ? categories.find((c) => c.slug === category)?.name : group ? groups[group] : q ? `Results for “${q}”` : "Shop All";

  const Filters = (
    <div className="space-y-8">
      <div>
        <h3 className="mb-3 text-lg font-semibold">Collections</h3>
        <ul className="space-y-1.5 text-sm">
          <li><button onClick={() => set({ group: undefined, category: undefined })} className={!group && !category ? "font-medium text-primary" : "text-muted-foreground hover:text-primary"}>All products</button></li>
          {Object.entries(groups).map(([k, v]) => (
            <li key={k}><button onClick={() => set({ group: k, category: undefined })} className={group === k ? "font-medium text-primary" : "text-muted-foreground hover:text-primary"}>{v}</button></li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-lg font-semibold">Product type</h3>
        <ul className="space-y-1.5 text-sm">
          {categories.map((c) => (
            <li key={c.slug}><label className="flex cursor-pointer items-center gap-2"><input type="radio" name="cat" checked={category === c.slug} onChange={() => set({ category: c.slug, group: undefined })} className="accent-[var(--primary)]" />{c.name}</label></li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-3 text-lg font-semibold">Price (starting)</h3>
        <input type="range" min={150} max={2500} step={50} value={maxPrice} onChange={(e) => setMaxPrice(+e.target.value)} className="w-full accent-[var(--primary)]" aria-label="Maximum price" />
        <p className="text-sm text-muted-foreground">Up to ₹{maxPrice.toLocaleString("en-IN")}</p>
      </div>
      <div>
        <h3 className="mb-3 text-lg font-semibold">Availability</h3>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} className="accent-[var(--primary)]" /> In stock only</label>
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-xs text-muted-foreground"><Link href="/" className="hover:text-primary">Home</Link> / <span>{title}</span></nav>
      <h1 className="mt-3 text-5xl font-semibold text-primary">{title}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">Handpicked, carefully packed and delivered to your door — explore our premium range.</p>

      <div className="mt-8 flex items-center justify-between gap-3 border-y border-border py-3">
        <button onClick={() => setDrawer(true)} className="flex items-center gap-2 text-sm lg:hidden"><SlidersHorizontal className="h-4 w-4" /> Filters</button>
        <p className="text-sm text-muted-foreground">{list.length} products</p>
        <select aria-label="Sort" value={sort ?? "featured"} onChange={(e) => set({ sort: e.target.value })} className="rounded-md border border-input bg-background px-2 py-1.5 text-sm">
          <option value="featured">Featured</option>
          <option value="popular">Popularity</option>
          <option value="price-asc">Price: Low to High</option>
          <option value="price-desc">Price: High to Low</option>
          <option value="newest">Newest</option>
        </select>
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[230px_1fr]">
        <aside className="hidden lg:block">{Filters}</aside>
        <div>
          {loading ? (
            <p className="py-16 text-center text-sm text-muted-foreground">Loading products…</p>
          ) : list.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-16 text-center text-muted-foreground">
              No products match these filters.
              <button onClick={() => { setMaxPrice(2500); setInStockOnly(false); clearSearch(); }} className="mt-3 block w-full text-primary underline">Clear filters</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:gap-6 xl:grid-cols-3">
                {list.slice(0, shown).map((p) => <ProductCard key={p.slug} p={p} />)}
              </div>
              {shown < list.length && (
                <div className="mt-10 text-center"><button onClick={() => setShown((n) => n + PAGE)} className="rounded-md border border-primary px-6 py-2.5 text-sm text-primary hover:bg-primary hover:text-primary-foreground">Load more</button></div>
              )}
            </>
          )}
        </div>
      </div>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-cocoa/60" onClick={() => setDrawer(false)} />
          <aside className="absolute inset-y-0 left-0 w-80 overflow-y-auto bg-background p-6 animate-in slide-in-from-left">
            <div className="mb-6 flex items-center justify-between"><h2 className="text-2xl font-semibold">Filters</h2><button onClick={() => setDrawer(false)} aria-label="Close filters"><X className="h-5 w-5" /></button></div>
            {Filters}
            <button onClick={() => setDrawer(false)} className="mt-8 w-full rounded-md bg-primary py-2.5 text-primary-foreground">Show {list.length} products</button>
          </aside>
        </div>
      )}
    </div>
  );
}
