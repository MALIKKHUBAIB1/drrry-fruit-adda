"use client";

import { useEffect, useState } from "react";
import ImageUploadButton from "./ImageUploadButton";

type Hero = {
  enabled: boolean;
  eyebrow: string;
  titleLine1: string;
  titleLine2: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  cta2Label: string;
  cta2Href: string;
  image: string;
};

const F = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const L = "text-xs uppercase tracking-wider text-muted-foreground";

/**
 * Home page hero banner editor. /api/settings se hero padhta hai aur wapas
 * PUT karta hai. Promo Banner tab ke andar mount hota hai.
 */
export default function HeroBannerEditor() {
  const [hero, setHero] = useState<Hero | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/settings", { cache: "no-store" });
        const b = await r.json();
        setHero(b.settings?.hero ?? null);
      } catch {
        setErr("Couldn't load hero settings.");
      }
    })();
  }, []);

  function set<K extends keyof Hero>(k: K, v: Hero[K]) {
    setOk(false);
    setHero((h) => (h ? { ...h, [k]: v } : h));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!hero) return;
    setBusy(true);
    setErr(null);
    setOk(false);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hero }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Save failed");
      setOk(true);
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Couldn't save.");
    } finally {
      setBusy(false);
    }
  }

  if (!hero) return <p className="py-6 text-sm text-muted-foreground">Loading hero…</p>;

  return (
    <form onSubmit={save} className="space-y-4 rounded-xl border border-gold/40 bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Hero Banner (Home page top)</h3>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={hero.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 accent-[var(--primary)]" />
          Enabled
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">
          <span className={L}>Eyebrow (small gold text)</span>
          <input value={hero.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} placeholder="The Luxury Collection" className={`${F} mt-1.5`} />
        </label>
        <label className="text-sm font-medium">
          <span className={L}>Title line 1</span>
          <input value={hero.titleLine1} onChange={(e) => set("titleLine1", e.target.value)} placeholder="Nature's Finest." className={`${F} mt-1.5`} />
        </label>
        <label className="text-sm font-medium">
          <span className={L}>Title line 2 (gold italic)</span>
          <input value={hero.titleLine2} onChange={(e) => set("titleLine2", e.target.value)} placeholder="Luxury in Every Bite." className={`${F} mt-1.5`} />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          <span className={L}>Subtitle</span>
          <textarea value={hero.subtitle} onChange={(e) => set("subtitle", e.target.value)} rows={2} placeholder="Discover handpicked premium dry fruits…" className={`${F} mt-1.5`} />
        </label>

        <label className="text-sm font-medium">
          <span className={L}>Primary button label</span>
          <input value={hero.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} placeholder="Shop Now" className={`${F} mt-1.5`} />
        </label>
        <label className="text-sm font-medium">
          <span className={L}>Primary button link</span>
          <input value={hero.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} placeholder="/shop" className={`${F} mt-1.5 font-mono`} />
        </label>
        <label className="text-sm font-medium">
          <span className={L}>Secondary button label (blank = hide)</span>
          <input value={hero.cta2Label} onChange={(e) => set("cta2Label", e.target.value)} placeholder="Explore Gift Hampers" className={`${F} mt-1.5`} />
        </label>
        <label className="text-sm font-medium">
          <span className={L}>Secondary button link</span>
          <input value={hero.cta2Href} onChange={(e) => set("cta2Href", e.target.value)} placeholder="/shop?group=gift-hampers" className={`${F} mt-1.5 font-mono`} />
        </label>

        <label className="text-sm font-medium sm:col-span-2">
          <span className={L}>Background image</span>
          <span className="mt-1.5 flex items-center gap-3">
            {hero.image && (
              <img src={hero.image} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} className="h-14 w-24 shrink-0 rounded-md border border-border object-cover" />
            )}
            <input value={hero.image} onChange={(e) => set("image", e.target.value)} placeholder="https://ik.imagekit.io/…" className={`${F} font-mono`} />
            <ImageUploadButton onUploaded={(url) => set("image", url)} category="site" label="Upload" />
          </span>
        </label>
      </div>

      {err && (
        <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">{err}</p>
      )}
      {ok && <p className="text-sm text-emerald-600">Saved. Homepage will show the new banner.</p>}

      <button disabled={busy} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
        {busy ? "Saving…" : "Save hero banner"}
      </button>
    </form>
  );
}
