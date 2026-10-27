"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  ClipboardList,
  HelpCircle,
  Heart,
  Info,
  Minus,
  Plus,
  Star,
} from "lucide-react";
import { useState } from "react";
import { galleryOf, inr, type Product } from "@/lib/products";
import { useStore } from "@/lib/store";
import { ProductCard } from "@/components/site/ProductCard";
import { ReviewsSection } from "@/components/site/Reviews";
import { cn } from "@/lib/utils";

export function ProductDetails({ p, related = [] }: { p: Product; related?: Product[] }) {
  const { add, wishlist, toggleWish } = useStore();
  const router = useRouter();
  const [vi, setVi] = useState(0);
  const [qty, setQty] = useState(1);
  const gallery = galleryOf(p);
  const [active, setActive] = useState(0);
  const v = p.variants[vi];

  // Amazon-style specs table — DB se, fallback minimal
  const faq: { q: string; a: string }[] = p.faq ?? [];

  const specs: { label: string; value: string }[] = p.specs?.length
    ? p.specs
    : [
        { label: "Brand", value: "Dryfruit Adda" },
        { label: "Net Weight", value: p.variants.map((x) => x.label).join(", ") },
        { label: "Storage", value: "Cool & dry place, airtight container" },
      ];

  if (!v) return null;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <nav className="text-xs text-muted-foreground"><Link href="/">Home</Link> / <Link href="/shop">Shop</Link> / {p.name}</nav>
      <div className="mt-6 grid gap-10 lg:grid-cols-2">
        <div>
          <div className="overflow-hidden rounded-lg border border-gold/30 bg-muted">
            <img
              src={gallery[active]}
              alt={`${p.name} — image ${active + 1}`}
              width={816}
              height={816}
              className="aspect-square w-full object-cover"
            />
          </div>
          {gallery.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {gallery.map((src, i) => (
                <button
                  key={src + i}
                  onClick={() => setActive(i)}
                  aria-label={`Show image ${i + 1}`}
                  className={cn(
                    "h-20 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition",
                    i === active ? "border-primary" : "border-border opacity-70 hover:opacity-100",
                  )}
                >
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
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
            <button disabled={!p.inStock} onClick={() => add(p.slug, v.label, qty)} className="flex-1 rounded-md bg-primary px-6 py-3 font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">Add to Cart</button>
            <button aria-label="Wishlist" onClick={() => toggleWish(p.slug)} className="rounded-md border border-input p-3 text-primary"><Heart className={cn("h-5 w-5", wishlist.includes(p.slug) && "fill-primary")} /></button>
          </div>
          <button disabled={!p.inStock} onClick={() => { add(p.slug, v.label, qty); router.push("/checkout"); }} className="mt-3 w-full rounded-md bg-gold py-3 font-medium text-cocoa hover:brightness-105 disabled:opacity-50">Buy Now</button>
          <p className={cn("mt-3 text-sm", p.inStock ? "text-primary" : "text-destructive")}>{p.inStock ? "● In stock" : "● Currently out of stock"}</p>


          <ul className="mt-6 space-y-2">
            {p.highlights.map((h) => <li key={h} className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-gold" />{h}</li>)}
          </ul>
        </div>
      </div>

      {/* ---- Product Info: Specifications + FAQ tabs ---- */}
      <ProductInfoTabs specs={specs} faq={faq} />

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

function ProductInfoTabs({
  specs,
  faq,
}: {
  specs: { label: string; value: string }[];
  faq: { q: string; a: string }[];
}) {
  const [tab, setTab] = useState<"specs" | "faq">("specs");
  const [open, setOpen] = useState<number | null>(0);

  const tabs = [
    { id: "specs" as const, label: "Specifications", Icon: ClipboardList, count: specs.length },
    { id: "faq" as const, label: "Frequently Asked Questions", Icon: HelpCircle, count: faq.length },
  ].filter((t) => t.count > 0);

  if (!tabs.length) return null;

  return (
    <section className="mt-16">
      {/* Tab bar — pill style, active pe solid */}
      <div className="flex gap-2 overflow-x-auto border-b border-border pb-px [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-selected={active}
              role="tab"
              className={cn(
                "group relative flex items-center gap-2 whitespace-nowrap rounded-t-lg px-4 py-3 text-sm font-medium transition",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <t.Icon className={cn("h-4 w-4", active ? "text-gold" : "text-muted-foreground")} />
              {t.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-secondary text-muted-foreground",
                )}
              >
                {t.count}
              </span>
              {/* active underline */}
              <span
                className={cn(
                  "absolute inset-x-0 -bottom-px h-0.5 rounded-full transition",
                  active ? "bg-gold opacity-100" : "bg-transparent opacity-0",
                )}
              />
            </button>
          );
        })}
      </div>

      {/* Panel */}
      <div
        role="tabpanel"
        className="mt-6 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7"
      >
        {tab === "specs" && specs.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-x-8 sm:grid-cols-2">
              {specs.map((sp, i) => (
                <div
                  key={sp.label + i}
                  className="flex items-start gap-4 border-b border-border/70 py-3.5 last:border-0 sm:[&:nth-last-child(-n+2)]:border-0"
                >
                  <dt className="w-36 shrink-0 text-sm text-muted-foreground sm:w-40">{sp.label}</dt>
                  <dd className="min-w-0 flex-1 text-sm font-medium text-foreground">{sp.value}</dd>
                </div>
              ))}
            </div>
            <p className="mt-6 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <Info className="h-3.5 w-3.5" />
              Allergen info and nutritional details vary by batch. Contact us for exact values.
            </p>
          </>
        )}

        {tab === "faq" && faq.length > 0 && (
          <div className="divide-y divide-border/70">
            {faq.map((f, i) => {
              const isOpen = open === i;
              return (
                <div key={i}>
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center gap-3 py-4 text-left"
                  >
                    <span className="min-w-0 flex-1 text-sm font-medium text-foreground sm:text-base">
                      {f.q}
                    </span>
                    <span
                      className={cn(
                        "grid h-7 w-7 shrink-0 place-items-center rounded-full transition",
                        isOpen ? "bg-primary text-primary-foreground" : "bg-secondary text-primary",
                      )}
                    >
                      <ChevronDown
                        className={cn("h-4 w-4 transition-transform duration-300", isOpen && "rotate-180")}
                      />
                    </span>
                  </button>
                  <div
                    className={cn(
                      "grid transition-all duration-300 ease-out",
                      isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
                    )}
                  >
                    <div className="overflow-hidden">
                      <p className="pb-4 pr-10 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
