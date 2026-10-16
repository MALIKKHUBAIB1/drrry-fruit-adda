import type { Metadata } from "next";
import { Suspense } from "react";
import ShopContent from "./ShopContent";

export const metadata: Metadata = {
  title: "Shop Dry Fruits, Nuts & Gift Hampers | Dryfruit Adda",
  description: "Browse premium almonds, cashews, pistachios, walnuts, dates, figs and gift hampers.",
  alternates: { canonical: "/shop" },
  openGraph: {
    title: "Shop | Dryfruit Adda",
    description: "Browse our full collection of premium dry fruits and gift hampers.",
    images: [{ url: "/images/hero.jpg", width: 1200, height: 630, alt: "Dryfruit Adda collection" }],
  },
};

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-10">Loading products…</div>}>
      <ShopContent />
    </Suspense>
  );
}
