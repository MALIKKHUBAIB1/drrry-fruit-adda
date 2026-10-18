"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import { categories as fallbackCategories, products as fallbackProducts, type Product } from "@/lib/products";
import { ProductCard } from "@/components/site/ProductCard";
import { useCatalog } from "@/lib/catalog";
import { cachedGet } from "@/lib/apiCache";

type Category = { slug: string; name: string; image: string };

export function CategoriesGrid() {
  // Shared catalog se — duplicate /api/categories call hata diya
  const { categories } = useCatalog();
  const cats: Category[] = categories.length ? categories : fallbackCategories;
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
      {cats.map((c) => (
        <Link key={c.slug} href={`/shop?category=${c.slug}`} className="group text-center">
          <div className="overflow-hidden rounded-full border-2 border-gold/40 p-1.5 transition group-hover:border-gold">
            <img src={c.image} alt={c.name} loading="lazy" width={300} height={300} className="aspect-square w-full rounded-full object-cover transition-transform duration-700 group-hover:scale-110" />
          </div>
          <p className="mt-3 font-display text-lg font-semibold text-foreground group-hover:text-primary">{c.name}</p>
        </Link>
      ))}
    </div>
  );
}

export function BestSellers() {
  // Shared catalog se — pehle har section apna /api/products call karta tha
  const { products } = useCatalog();
  const src = products.length ? products : fallbackProducts;

  const best = useMemo(() => {
    const tagged = src.filter((p) => p.badge === "Best Seller");
    const rest = src.filter((p) => p.badge !== "Best Seller");
    return [...tagged, ...rest].slice(0, 8);
  }, [src]);

  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-4">
      {best.map((p) => (
        <ProductCard key={p.slug} p={p} />
      ))}
    </div>
  );
}

type FeaturedReview = {
  id: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  productName: string;
};

const FALLBACK: FeaturedReview[] = [
  { id: "f1", userName: "Priya S.", rating: 5, title: "", comment: "The cashews were huge and so creamy. The gift box looked beautiful for Diwali.", productName: "Jumbo W240 Cashews" },
  { id: "f2", userName: "Rahul M.", rating: 5, title: "", comment: "Medjool dates are soft and sweet — my whole family loved them.", productName: "Arabian Medjool Dates" },
  { id: "f3", userName: "Ayesha K.", rating: 5, title: "", comment: "Lovely packaging and quick delivery. Will order the almonds again.", productName: "Premium California Almonds" },
];

export function HomeTestimonials() {
  const [reviews, setReviews] = useState<FeaturedReview[]>(FALLBACK);
  useEffect(() => {
    cachedGet<{ reviews: FeaturedReview[] }>("/api/reviews/featured?limit=3")
      .then(({ data }) => {
        if (data?.reviews?.length) setReviews(data.reviews);
      })
      .catch(() => {});
  }, []);
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {reviews.map((r) => (
        <figure key={r.id} className="rounded-lg bg-card p-7 shadow-sm">
          <div className="flex gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={
                  i < r.rating ? "h-4 w-4 fill-gold text-gold" : "h-4 w-4 text-border"
                }
              />
            ))}
          </div>
          <blockquote className="mt-4 font-display text-xl leading-snug italic">
            &quot;{r.comment}&quot;
          </blockquote>
          <figcaption className="mt-4 text-sm text-muted-foreground">
            — {r.userName} · <span className="text-primary">{r.productName}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

/**
 * New Arrivals — Best Sellers grid se alag design:
 * horizontal snap-scroll rail (agla card dikhta rehta hai),
 * desktop par arrow buttons, har card par "NEW" ribbon + rank number.
 */
export function NewArrivals() {
  const rail = useRef<HTMLDivElement>(null);
  // Shared catalog se — pehle ye bhi apna /api/products call karta tha
  const { products } = useCatalog();
  const src = products.length ? products : fallbackProducts;

  const list = useMemo(() => {
    const tagged = src.filter((p) => p.badge === "New Arrival");
    const rest = src
      .filter((p) => p.badge !== "New Arrival")
      .sort((a, b) => (b.added ?? 0) - (a.added ?? 0));
    return [...tagged, ...rest].slice(0, 10);
  }, [src]);

  const [edge, setEdge] = useState<{ start: boolean; end: boolean }>({ start: true, end: false });

  // Rail kahan hai — arrows ke hisaab se hide/disable
  useEffect(() => {
    const el = rail.current;
    if (!el) return;
    const onScroll = () =>
      setEdge({
        start: el.scrollLeft < 8,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
      });
    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [list]);

  const nudge = (dir: 1 | -1) => {
    const el = rail.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-card]");
    const step = card ? card.offsetWidth + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => nudge(-1)}
        aria-label="Scroll new arrivals left"
        disabled={edge.start}
        className="absolute -left-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-primary shadow-md transition hover:border-gold disabled:opacity-0 lg:grid"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button
        type="button"
        onClick={() => nudge(1)}
        aria-label="Scroll new arrivals right"
        disabled={edge.end}
        className="absolute -right-4 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-border bg-card text-primary shadow-md transition hover:border-gold disabled:opacity-0 lg:grid"
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      <div
        ref={rail}
        className="-mx-4 flex snap-x snap-mandatory gap-6 overflow-x-auto px-4 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((p) => (
          <div
            key={p.slug}
            data-card
            className="group relative w-[68vw] shrink-0 snap-start sm:w-[42vw] lg:w-[274px]"
          >
            <div className="relative h-full overflow-hidden rounded-lg transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_-20px_color-mix(in_oklab,var(--primary)_50%,transparent)]">
              <ProductCard p={p} />
            </div>
          </div>
        ))}
      </div>

      <p className="mt-4 text-center text-xs tracking-wider text-muted-foreground lg:hidden">
        Swipe to see more →
      </p>
    </div>
  );
}
