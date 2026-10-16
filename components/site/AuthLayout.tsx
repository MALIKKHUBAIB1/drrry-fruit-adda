import Link from "next/link";
import { BadgeCheck, Lock, Star, Truck, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export const authInput =
  "w-full rounded-xl border border-[#E4DDCD] bg-[#FDFCF9] py-3 pl-10 pr-10 text-[15px] outline-none transition placeholder:text-[#A8A094] hover:border-[#CFC5AD] focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10";

export function AuthLayout({
  eyebrow,
  title,
  subtitle,
  children,
  switchText,
  switchLink,
  switchLabel,
  switchSearch,
  image = "/images/hero.jpg",
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  switchText: string;
  switchLink: "/login" | "/register";
  switchLabel: string;
  switchSearch?: Record<string, string> | undefined;
  image?: string;
}) {
  const perks: { icon: LucideIcon; t: string }[] = [
    { icon: Truck, t: "Free shipping over ₹999" },
    { icon: BadgeCheck, t: "Hand-sorted premium quality" },
    { icon: Lock, t: "Secure checkout · COD & UPI" },
  ];
  const switchHref =
    switchSearch && Object.keys(switchSearch).length > 0
      ? `${switchLink}?${new URLSearchParams(switchSearch).toString()}`
      : switchLink;
  return (
    <div className="bg-[#FAF7F0]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="grid overflow-hidden rounded-[28px] border border-black/[0.06] bg-white shadow-[0_24px_70px_-20px_rgba(59,29,22,0.35)] lg:grid-cols-[1fr_1fr]">
          {/* Left — brand panel */}
          <div className="relative hidden min-h-[560px] flex-col justify-between overflow-hidden bg-cocoa p-10 lg:flex">
            <img
              src={image}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-35"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-cocoa/60 via-cocoa/80 to-cocoa" />
            <div className="relative flex items-center gap-3">
              <img
                src="/images/logo-sm.jpg"
                alt="Dryfruit Adda"
                className="h-12 w-12 rounded-full ring-1 ring-gold"
              />
              <div>
                <p className="font-display text-xl font-bold text-cocoa-foreground">
                  Dryfruit Adda
                </p>
                <p className="text-[11px] uppercase tracking-[0.25em] text-gold">
                  Luxury in every bite
                </p>
              </div>
            </div>
            <div className="relative">
              <div className="flex gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 fill-gold text-gold" />
                ))}
              </div>
              <blockquote className="mt-4 font-display text-3xl italic leading-snug text-cocoa-foreground">
                “The gift box looked imported. Cashews were huge and creamy.”
              </blockquote>
              <p className="mt-3 text-sm text-cocoa-foreground/70">
                — Priya S., Mumbai · Verified buyer
              </p>
              <ul className="mt-8 space-y-2.5">
                {perks.map(({ icon: I, t }) => (
                  <li
                    key={t}
                    className="flex items-center gap-2.5 text-sm text-cocoa-foreground/85"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-gold/15 text-gold">
                      <I className="h-4 w-4" />
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Right — form */}
          <div className="p-7 sm:p-10 lg:p-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/70">
              {eyebrow}
            </p>
            <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {title}
            </h1>
            <p className="mt-2 text-[15px] text-muted-foreground">{subtitle}</p>
            <div className="mt-7">{children}</div>
            <p className="mt-6 border-t border-black/[0.06] pt-5 text-center text-sm text-muted-foreground">
              {switchText}{" "}
              <Link
                href={switchHref}
                className="font-semibold text-primary hover:underline"
              >
                {switchLabel}
              </Link>
            </p>
          </div>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo login — accounts are saved only in this browser.
        </p>
      </div>
    </div>
  );
}
