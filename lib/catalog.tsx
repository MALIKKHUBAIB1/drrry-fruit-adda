"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { products as fallback, type Product } from "./products";

type CatalogCtx = {
  products: Product[];
  ready: boolean;
  get: (slug: string) => Product | undefined;
};

const Ctx = createContext<CatalogCtx | null>(null);

/**
 * Catalogue ko API se laata hai taaki admin ke kiye changes (price, images,
 * stock, delivery options) cart / checkout / wishlist me bhi dikhen.
 * API fail ho to static seed catalogue par fallback.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(fallback);

  useEffect(() => {
    let alive = true;
    fetch("/api/products")
      .then((r) => r.json())
      .then((d) => {
        if (alive && Array.isArray(d.products) && d.products.length) setProducts(d.products);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo<CatalogCtx>(
    () => ({
      products,
      ready: true,
      get: (slug: string) => products.find((p) => p.slug === slug),
    }),
    [products],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCatalog() {
  return useContext(Ctx) ?? { products: fallback, ready: false, get: (s: string) => fallback.find((p) => p.slug === s) };
}