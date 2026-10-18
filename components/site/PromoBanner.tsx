"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSettings } from "@/lib/catalog";
import { Check, Copy, Gift, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

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

function useCountdown(target: string) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return null;
  const d = Math.floor(diff / (1000 * 60 * 60 * 24));
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const m = Math.floor((diff / (1000 * 60)) % 60);
  const s = Math.floor((diff / 1000) % 60);
  return { d, h, m, s };
}

export function PromoBanner() {
  // Promo shared context se — duplicate fetch hata diya
  const promo = useSettings().promo;
  const [copied, setCopied] = useState(false);

  const cd = useCountdown(promo?.expiresAt ?? "");

  if (!promo || !promo.enabled) return null;
  if (promo.expiresAt && new Date(promo.expiresAt).getTime() <= Date.now()) return null;

  const copyCode = async () => {
    if (!promo.couponCode) return;
    try {
      await navigator.clipboard.writeText(promo.couponCode);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = promo.couponCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section
      className="relative overflow-hidden py-6 sm:py-8"
      style={{ backgroundColor: promo.bgColor }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-20">
        <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-gold blur-3xl" />
        <div className="absolute -bottom-12 -right-10 h-44 w-44 rounded-full bg-gold blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between sm:gap-5">
          {/* Left: title + subtitle */}
          <div className="flex items-center gap-3 text-center sm:text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gold/20 text-gold">
              <Gift className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[9px] uppercase tracking-[0.3em] text-gold">Limited time</p>
              <h2 className="font-display text-lg font-semibold leading-tight text-cocoa-foreground sm:text-xl">
                {promo.title}
                <span className="ml-2 font-normal text-cocoa-foreground/70">— {promo.subtitle}</span>
              </h2>
            </div>
          </div>

          {/* Right: countdown + coupon + CTA in one row */}
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
            {cd && (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Timer className="h-4 w-4 text-gold animate-pulse" />
                {[
                  { v: cd.d, l: "Days" },
                  { v: cd.h, l: "Hrs" },
                  { v: cd.m, l: "Min" },
                  { v: cd.s, l: "Sec" },
                ].map(({ v, l }) => (
                  <span
                    key={l}
                    className="inline-flex flex-col items-center rounded-lg bg-white/10 px-2 py-1.5 backdrop-blur ring-1 ring-gold/20 transition-transform duration-300"
                  >
                    <span className="font-mono text-xl font-bold leading-none text-cocoa-foreground sm:text-2xl">
                      {String(v).padStart(2, "0")}
                    </span>
                    <span className="mt-1 text-[9px] uppercase tracking-wider text-cocoa-foreground/60">{l}</span>
                  </span>
                ))}
              </div>
            )}

            {promo.couponCode && (
              <button
                onClick={copyCode}
                className="group inline-flex items-center gap-2 rounded-lg border-2 border-dashed border-gold/60 bg-white/5 px-3 py-1.5 backdrop-blur transition hover:border-gold hover:bg-gold/10"
                aria-label="Copy coupon code"
                title={copied ? "Copied!" : "Click to copy"}
              >
                <span className="font-mono text-lg font-bold tracking-wider text-gold sm:text-xl">
                  {promo.couponCode}
                </span>
                <span
                  className={cn(
                    "grid h-6 w-6 place-items-center rounded-md transition",
                    copied ? "bg-green-500/20 text-green-300" : "bg-gold/20 text-gold group-hover:bg-gold group-hover:text-cocoa",
                  )}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                </span>
              </button>
            )}

            <Link
              href={promo.ctaHref || "/shop"}
              className="rounded-md bg-gold px-5 py-2 text-xs font-semibold uppercase tracking-widest text-cocoa shadow-md transition hover:brightness-110 sm:text-sm"
            >
              {promo.ctaLabel || "Shop Now"}
            </Link>
          </div>
        </div>
        {copied && (
          <p className="mt-1 text-center text-[11px] text-cocoa-foreground/70 sm:text-right">
            Copied to clipboard!
          </p>
        )}
      </div>
    </section>
  );
}
