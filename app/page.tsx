import type { Metadata } from "next";
import Link from "next/link";
import { Award, Headphones, Leaf, Package, ShieldCheck, Truck } from "lucide-react";
import { NewsletterForm } from "@/components/site/Newsletter";
import { AvailableOffers } from "@/components/site/AvailableOffers";
import { BestSellers, CategoriesGrid, GiftHampers, HomeTestimonials, NewArrivals } from "@/components/site/HomeSections";
import { PromoBanner } from "@/components/site/PromoBanner";
import { DEFAULT_OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from "@/lib/seo";
import { readDb } from "@/lib/server/db";

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description: "Shop handpicked almonds, cashews, pistachios, dates, figs and luxury dry fruit gift hampers. Delivered across India.",
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
  },
};

function Heading({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div className="mb-10 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-gold">{eyebrow}</p>
      <h2 className="mt-2 text-4xl font-semibold text-primary sm:text-5xl">{title}</h2>
      <div className="mx-auto mt-4 h-px w-20 bg-gold" />
    </div>
  );
}

const benefits = [
  { icon: Leaf, t: "Carefully Selected", d: "Every batch is sorted for size, colour and taste." },
  { icon: Award, t: "Premium Quality", d: "Only top grades make it into our packs." },
  { icon: Package, t: "Freshness-Focused Packing", d: "Sealed, resealable packs to protect flavour." },
  { icon: ShieldCheck, t: "Secure Payments", d: "Pay safely by UPI, card or cash on delivery." },
  { icon: Truck, t: "Delivery Across India", d: "Reliable shipping to your doorstep." },
  { icon: Headphones, t: "Customer Support", d: "Friendly help whenever you need it." },
];

export default async function Home() {
  const db = await readDb();
  const hero = db.settings.hero;
  return (
    <>
      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-[radial-gradient(ellipse_at_78%_18%,_rgba(214,168,68,0.20),_transparent_34%),radial-gradient(ellipse_at_8%_92%,_rgba(120,57,34,0.42),_transparent_42%),linear-gradient(125deg,#160d0a_0%,#2b1711_48%,#100b09_100%)]">
        <div aria-hidden="true" className="pointer-events-none absolute -right-28 top-1/2 h-[32rem] w-[32rem] -translate-y-1/2 rounded-full bg-gold/10 blur-[110px]" />
        {hero.enabled && (
          <>
            <img src={hero.image} alt="" width={1920} height={1088} className="absolute inset-0 h-full w-full object-cover object-right" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#160d0a]/95 via-[#21120d]/80 to-[#160d0a]/25" />
            <div className="relative mx-auto flex min-h-[78vh] max-w-7xl items-center px-4 py-20">
              <div className="max-w-xl">
                {hero.eyebrow && (
                  <p className="animate-rise text-xs uppercase tracking-[0.35em] text-gold">{hero.eyebrow}</p>
                )}
                <h1 className="animate-rise mt-4 text-5xl leading-[1.05] font-semibold text-cocoa-foreground sm:text-7xl" style={{ animationDelay: "120ms" }}>
                  {hero.titleLine1}
                  {hero.titleLine2 && (
                    <>
                      <br />
                      <em className="text-gold">{hero.titleLine2}</em>
                    </>
                  )}
                </h1>
                {hero.subtitle && (
                  <p className="animate-rise mt-6 text-lg leading-relaxed text-cocoa-foreground/80" style={{ animationDelay: "240ms" }}>
                    {hero.subtitle}
                  </p>
                )}
                <div className="animate-rise mt-9 flex flex-wrap gap-3" style={{ animationDelay: "360ms" }}>
                  {hero.ctaLabel && (
                    <Link href={hero.ctaHref || "/shop"} className="rounded-md bg-gold px-7 py-3.5 text-sm font-medium uppercase tracking-widest text-cocoa transition hover:brightness-110">
                      {hero.ctaLabel}
                    </Link>
                  )}
                  {hero.cta2Label && (
                    <Link href={hero.cta2Href || "/shop"} className="rounded-md border border-gold px-7 py-3.5 text-sm font-medium uppercase tracking-widest text-gold transition hover:bg-gold/10">
                      {hero.cta2Label}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </section>

      {/* Promo banner (admin manageable) */}
      <PromoBanner />

      {/* Available offer codes (admin coupons, live from DB) */}
      <section className="border-y border-gold/25 bg-gold/[0.07]">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <AvailableOffers />
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <Heading eyebrow="Handpicked & Premium" title="Explore the Collection" />
        <CategoriesGrid />
      </section>

      {/* Best sellers */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Heading eyebrow="Most Loved" title="Best Sellers" />
          <BestSellers />
          <div className="mt-10 text-center">
            <Link href="/shop" className="inline-block border-b border-primary pb-1 text-sm uppercase tracking-widest text-primary">View all products</Link>
          </div>
        </div>
      </section>

      {/* Promo */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Heading eyebrow="Freshly Added" title="New Arrivals" />
          <NewArrivals />
          <div className="mt-10 text-center">
            <Link href="/shop?sort=newest" className="inline-block border-b border-primary pb-1 text-sm uppercase tracking-widest text-primary">See what&apos;s new</Link>
          </div>
        </div>
      </section>

      <section className="bg-[radial-gradient(ellipse_at_75%_50%,_rgba(214,168,68,0.15),_transparent_40%),linear-gradient(120deg,#160d0a_0%,#321b13_55%,#1b100c_100%)]">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 md:grid-cols-2">
          <img src="https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/gift_JYpveUrx4.jpg" alt="Dryfruit Adda signature gift box" loading="lazy" width={1024} height={1024} className="w-full rounded-lg border border-gold/40 object-cover shadow-2xl" />
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-gold">Gifting</p>
            <h2 className="mt-3 text-5xl font-semibold text-cocoa-foreground">Make Every Celebration <em className="text-gold">Golden.</em></h2>
            <p className="mt-5 text-lg text-cocoa-foreground/75">Thoughtfully curated dry-fruit hampers for festivals, weddings, corporate gifting, and special moments.</p>
            <Link href="/shop?group=gift-hampers" className="mt-8 inline-block rounded-md bg-gold px-7 py-3.5 text-sm font-medium uppercase tracking-widest text-cocoa">Explore Gift Hampers</Link>
          </div>
        </div>
      </section>

      {/* Gift hampers */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Heading eyebrow="Curated Gifting" title="Gift Hampers" />
          <GiftHampers />
          <div className="mt-10 text-center">
            <Link href="/shop?group=gift-hampers" className="inline-block border-b border-primary pb-1 text-sm uppercase tracking-widest text-primary">View all gift hampers</Link>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <Heading eyebrow="Our Promise" title="Why Choose Dryfruit Adda?" />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: I, t, d }) => (
            <div key={t} className="flex gap-4 rounded-lg border border-gold/30 bg-card p-6">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-secondary text-primary"><I className="h-5 w-5" /></span>
              <div><h3 className="text-xl font-semibold">{t}</h3><p className="mt-1 text-sm text-muted-foreground">{d}</p></div>
            </div>
          ))}
        </div>
      </section>

      {/* Reviews */}
      <section className="bg-secondary py-20">
        <div className="mx-auto max-w-7xl px-4">
          <Heading eyebrow="Kind Words" title="What Customers Say" />
          <HomeTestimonials />
        </div>
      </section>

      {/* Newsletter */}
      <section className="mx-auto max-w-2xl px-4 py-20 text-center">
        <h2 className="text-4xl font-semibold text-primary">Get a Little More Goodness in Your Inbox</h2>
        <p className="mb-6 mt-3 text-muted-foreground">Offers, new arrivals and updates — no spam.</p>
        <NewsletterForm />
      </section>
    </>
  );
}
