"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { products as fallback, type Product } from "./products";
import { cachedGet, bustCache } from "./apiCache";

type Promo = {
  enabled: boolean;
  title: string;
  subtitle: string;
  couponCode: string;
  expiresAt: string;
  ctaLabel: string;
  ctaHref: string;
  bgColor: string;
};

type CatalogCtx = {
  products: Product[];
  categories: { slug: string; name: string; image: string }[];
  settings: { announcements: string[]; promo: Promo | null };
  ready: boolean;
  get: (slug: string) => Product | undefined;
  /** Catalogue thoda stale ho to force refresh (admin edit ke baad) */
  refreshCatalog: () => Promise<void>;
};

const FALLBACK_SETTINGS = {
  announcements: [
    "Premium Dry Fruits, Delivered to Your Doorstep",
    "Special Offers on Premium Gift Boxes",
    "Free Shipping on Orders Above ₹999",
  ],
  promo: null as Promo | null,
};

const Ctx = createContext<CatalogCtx | null>(null);

/**
 * Site ka shared data ek baar fetch karta hai aur pure tree me deta hai.
 *
 * Pehle har component apna fetch karta tha:
 *   Header        -> /api/settings
 *   PromoBanner   -> /api/settings     (duplicate!)
 *   Catalog       -> /api/products
 *   BestSellers   -> /api/products?... (duplicate!)
 *   NewArrivals   -> /api/products?... (duplicate!)
 *   CategoriesGrid-> /api/categories
 *
 * Ab teen GETs hi hoti hain (aur reload par woh bhi localStorage se),
 * components sirf context padhte hain.
 */
export function CatalogProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(fallback);
  const [categories, setCategories] = useState<CatalogCtx["categories"]>([]);
  const [settings, setSettings] = useState(FALLBACK_SETTINGS);
  const [ready, setReady] = useState(false);

  const load = useCallback(async (force = false) => {
    const [p, c, s] = await Promise.all([
      cachedGet<{ products: Product[] }>("/api/products"),
      cachedGet<{ categories: CatalogCtx["categories"] }>("/api/categories"),
      cachedGet<{ settings: CatalogCtx["settings"] }>("/api/settings"),
    ]);
    if (p.data?.products?.length) setProducts(p.data.products);
    if (c.data?.categories?.length) setCategories(c.data.categories);
    if (s.data?.settings) {
      setSettings({
        announcements: s.data.settings.announcements?.length
          ? s.data.settings.announcements
          : FALLBACK_SETTINGS.announcements,
        promo: s.data.settings.promo ?? null,
      });
    }
    if (force) bustCache();
    setReady(true);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshCatalog = useCallback(async () => {
    bustCache("/api/products");
    await load(true);
  }, [load]);

  const value = useMemo<CatalogCtx>(
    () => ({
      products,
      categories,
      settings,
      ready,
      get: (slug: string) => products.find((p) => p.slug === slug),
      refreshCatalog,
    }),
    [products, categories, settings, ready, refreshCatalog],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

const offline = {
  products: fallback,
  categories: [] as { slug: string; name: string; image: string }[],
  settings: FALLBACK_SETTINGS,
  ready: false,
  get: (s: string) => fallback.find((p) => p.slug === s),
  refreshCatalog: async () => {},
};

export function useCatalog() {
  return useContext(Ctx) ?? offline;
}

export function useSettings() {
  return useContext(Ctx)?.settings ?? FALLBACK_SETTINGS;
}