"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { categories as fallbackCategories, products as fallbackProducts, type Product } from "@/lib/products";
import { ProductCard } from "@/components/site/ProductCard";

type Category = { slug: string; name: string; image: string };

export function CategoriesGrid() {
  const [cats, setCats] = useState<Category[]>(fallbackCategories);
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => {
        if (d.categories?.length) setCats(d.categories);
      })
      .catch(() => {});
  }, []);
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
  const [best, setBest] = useState<Product[]>(() =>
    fallbackProducts
      .filter((p) => p.badge === "Best Seller")
      .concat(fallbackProducts.filter((p) => p.badge !== "Best Seller"))
      .slice(0, 8),
  );
  useEffect(() => {
    fetch("/api/products?badge=Best+Seller&limit=8")
      .then((r) => r.json())
      .then((d) => {
        if (d.products?.length) setBest(d.products);
      })
      .catch(() => {});
  }, []);
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
    fetch("/api/reviews/featured?limit=3")
      .then((r) => r.json())
      .then((d) => {
        if (d.reviews?.length) setReviews(d.reviews);
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
