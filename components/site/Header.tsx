"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";
import { products } from "@/lib/products";
import { useStore } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { useCatalog } from "@/lib/catalog";

const nav: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Shop All", href: "/shop" },
  { label: "Dry Fruits", href: "/shop?group=dry-fruits" },
  { label: "Nuts & Seeds", href: "/shop?group=nuts-seeds" },
  { label: "Dates & Figs", href: "/shop?group=dates-figs" },
  { label: "Gift Hampers", href: "/shop?group=gift-hampers" },
  { label: "Best Sellers", href: "/shop?sort=popular" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

function SearchBox({ onDone }: { onDone?: () => void }) {
  const [q, setQ] = useState("");
  const router = useRouter();
  const hits =
    q.length > 1
      ? products.filter((p) => p.name.toLowerCase().includes(q.toLowerCase())).slice(0, 5)
      : [];
  return (
    <div className="relative w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/shop?q=${encodeURIComponent(q)}`);
          setQ("");
          onDone?.();
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search almonds, dates, gift boxes…"
          aria-label="Search products"
          className="w-full rounded-full border border-input bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-gold"
        />
      </form>
      {hits.length > 0 && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {hits.map((p) => (
            <Link
              key={p.slug}
              href={`/product/${p.slug}`}
              onClick={() => {
                setQ("");
                onDone?.();
              }}
              className="flex items-center gap-3 px-3 py-2 text-sm hover:bg-muted"
            >
              <img src={p.image} alt="" className="h-9 w-9 rounded object-cover" /> {p.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function Header({ announcements }: { announcements?: string[] }) {
  const { count, setCartOpen, wishlist } = useStore();
  const { user } = useAuth();
  const { settings } = useCatalog();
  const [open, setOpen] = useState(false);
  // Messages shared context se — Header khud fetch nahi karta (duplicate hata diya)
  const messages = announcements?.length ? announcements : settings.announcements;

  return (
    <>
      <div className="h-8 overflow-hidden bg-cocoa text-center text-xs tracking-wider text-gold">
        <div className="animate-ticker">
          {messages.map((m, i) => (
            <p key={`${m}-${i}`} className="flex h-6 items-center justify-center pt-2">
              {m}
            </p>
          ))}
        </div>
      </div>
      <header className="sticky top-0 z-40 border-b border-gold/30 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
          <button className="lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
            <Menu className="h-6 w-6 text-primary" />
          </button>
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <img
              src="https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/logo-sm_8aov28_Ti.jpg"
              alt="Dryfruit Adda"
              width={48}
              height={48}
              className="h-11 w-11 rounded-full ring-1 ring-gold sm:h-12 sm:w-12"
            />
            <span className="hidden font-display text-xl font-bold tracking-wide text-primary sm:block">
              Dryfruit Adda
            </span>
          </Link>
          <div className="mx-auto hidden max-w-md flex-1 md:block">
            <SearchBox />
          </div>
          <div className="ml-auto flex items-center gap-1 text-primary md:ml-0">
            <Link
              href="/account"
              aria-label="Account"
              title={user ? user.name : "Login / Register"}
              className="hidden rounded-full p-2 hover:bg-muted sm:block"
            >
              {user ? (
                <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  {user.name.trim().charAt(0).toUpperCase()}
                </span>
              ) : (
                <User className="h-5 w-5" />
              )}
            </Link>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="relative rounded-full p-2 hover:bg-muted"
            >
              <Heart className="h-5 w-5" />
              {wishlist.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-gold px-1 text-[10px] font-bold text-cocoa">
                  {wishlist.length}
                </span>
              )}
            </Link>
            <button
              onClick={() => setCartOpen(true)}
              aria-label="Open cart"
              className="relative rounded-full p-2 hover:bg-muted"
            >
              <ShoppingBag className="h-5 w-5" />
              {count > 0 && (
                <span
                  key={count}
                  className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 animate-in zoom-in place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground"
                >
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
        <nav className="hidden border-t border-border lg:block">
          <ul className="mx-auto flex max-w-7xl justify-center gap-7 px-4 py-2.5 text-[13px] uppercase tracking-[0.14em]">
            {nav.map((n) => (
              <li key={n.label}>
                <Link
                  href={n.href}
                  className="text-foreground/80 transition hover:text-primary"
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="border-t border-border px-4 py-2 md:hidden">
          <SearchBox />
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-cocoa/60 animate-in fade-in"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-background p-6 shadow-xl animate-in slide-in-from-left">
            <button onClick={() => setOpen(false)} aria-label="Close menu" className="mb-6">
              <X className="h-6 w-6 text-primary" />
            </button>
            <ul className="space-y-4">
              {nav.map((n) => (
                <li key={n.label}>
                  <Link
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className="font-display text-xl text-foreground hover:text-primary"
                  >
                    {n.label}
                  </Link>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      )}
    </>
  );
}
