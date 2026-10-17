"use client";

import Link from "next/link";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState } from "react";
import {
  Gift,
  LayoutDashboard,
  LayoutGrid,
  LogOut,
  Mail,
  Megaphone,
  MapPinned,
  Menu,
  Package,
  ShoppingBag,
  Star,
  Store,
  Ticket,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { tab: "Overview", Icon: LayoutDashboard },
  { tab: "Orders", Icon: ShoppingBag },
  { tab: "Products", Icon: Package },
  { tab: "Categories", Icon: LayoutGrid },
  { tab: "Gift Hampers", Icon: Gift },
  { tab: "Promo Banner", Icon: Megaphone },
  { tab: "Pincodes", Icon: MapPinned },
  { tab: "Coupons", Icon: Ticket },
  { tab: "Users", Icon: Users },
  { tab: "Messages", Icon: Mail },
  { tab: "Reviews", Icon: Star },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const active = searchParams.get("tab") ?? "Overview";
  const initial = user?.name.trim().charAt(0).toUpperCase() || "A";

  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");

  if (isLogin) {
    return <>{children}</>;
  }

  const doLogout = async () => {
    await logout();
    router.push("/");
  };

  const side = (
    <div className="flex h-full flex-col bg-cocoa text-cocoa-foreground">
      <Link href="/admin" className="flex items-center gap-3 px-6 pb-6 pt-7">
        <span className="grid h-10 w-10 place-items-center rounded-full bg-gold font-display text-xl font-bold text-cocoa">
          D
        </span>
        <span>
          <span className="block font-display text-lg font-semibold leading-tight">Dryfruit Adda</span>
          <span className="block text-[11px] uppercase tracking-[0.25em] text-gold">Admin Panel</span>
        </span>
      </Link>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Admin">
        {NAV.map(({ tab, Icon }) => (
          <Link
            key={tab}
            href={tab === "Overview" ? "/admin" : `/admin?tab=${tab}`}
            onClick={() => setOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition",
              active === tab
                ? "bg-gold text-cocoa"
                : "text-cocoa-foreground/70 hover:bg-white/10 hover:text-cocoa-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {tab}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-white/10 p-3">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-cocoa-foreground/70 transition hover:bg-white/10 hover:text-cocoa-foreground"
        >
          <Store className="h-4 w-4" /> View Store
        </Link>
        <button
          onClick={doLogout}
          className="flex w-full items-center gap-3 rounded-lg px-4 py-2.5 text-sm text-cocoa-foreground/70 transition hover:bg-white/10 hover:text-cocoa-foreground"
        >
          <LogOut className="h-4 w-4" /> Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/60 lg:flex">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 lg:block">{side}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-cocoa/60" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 animate-in slide-in-from-left">
            <button
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="absolute right-3 top-5 z-10 rounded-md p-1.5 text-cocoa-foreground/70 hover:text-cocoa-foreground"
            >
              <X className="h-5 w-5" />
            </button>
            {side}
          </aside>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            className="rounded-md border border-input p-2 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="font-display text-xl font-semibold text-primary">
            {active === "Overview" ? "Dashboard" : active}
          </h1>
          <span className="flex-1" />
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-xs hover:border-gold sm:flex"
          >
            <Store className="h-3.5 w-3.5" /> View Store
          </Link>
          <span className="flex items-center gap-2 text-sm">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initial}
            </span>
            <span className="hidden max-w-32 truncate font-medium md:block">{user?.name}</span>
          </span>
          <button
            onClick={doLogout}
            aria-label="Logout"
            className="rounded-md border border-input p-2 hover:border-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
