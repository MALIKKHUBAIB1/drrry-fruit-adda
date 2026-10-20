import type { Metadata } from "next";
import Link from "next/link";
import { Award, Gift, HandHeart, Leaf, PackageCheck, Sparkles, Star, Truck } from "lucide-react";

export const metadata: Metadata = {
  title: "About Us | Dryfruit Adda",
  description: "The story behind Dryfruit Adda — premium, handpicked dry fruits for every occasion.",
  alternates: { canonical: "/about" },
  openGraph: {
    title: "About Dryfruit Adda",
    description: "Premium, handpicked dry fruits for every occasion.",
    images: [{ url: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/hero_PHRF6HPzu.jpg", width: 1200, height: 630, alt: "Dryfruit Adda" }],
  },
};

const stats = [
  { n: "50k+", l: "Happy customers" },
  { n: "4.8★", l: "Average rating" },
  { n: "120+", l: "Cities served" },
  { n: "100%", l: "Hand-sorted packs" },
];

const values = [
  {
    icon: Leaf,
    t: "Natural first",
    d: "No artificial colour or flavour. Just honest, farm-fresh produce dried and packed with care.",
  },
  {
    icon: Award,
    t: "Only top grades",
    d: "W240 cashews, large Medjools, light Kashmiri walnut halves — we buy the grade we'd serve at home.",
  },
  {
    icon: PackageCheck,
    t: "Freshness-locked",
    d: "Small batches, sealed resealable pouches and protective outer boxes keep crunch and aroma intact.",
  },
  {
    icon: HandHeart,
    t: "Fair sourcing",
    d: "Long-term ties with growers and mandis mean better prices for farmers and better quality for you.",
  },
];

const steps = [
  {
    n: "01",
    t: "Select",
    d: "Each lot is checked for size, colour, moisture and taste before it enters our shelves.",
  },
  {
    n: "02",
    t: "Sort",
    d: "Kernels are hand-sorted to remove shrivelled or discoloured pieces. Only even, premium pieces remain.",
  },
  {
    n: "03",
    t: "Pack",
    d: "Packed in food-safe resealable pouches the same week — never stored open in bins.",
  },
  {
    n: "04",
    t: "Deliver",
    d: "Cushioned boxes ship across India in 3–7 days, with COD and easy support on every order.",
  },
];

const timeline = [
  {
    y: "2021",
    t: "A family adda",
    d: "We started packing almonds and cashews for friends and festive gifting from a small kitchen shelf.",
  },
  {
    y: "2022",
    t: "Pan-India shipping",
    d: "Word spread — we moved to sealed pouches and started delivering to 50+ cities.",
  },
  {
    y: "2024",
    t: "Gift hampers",
    d: "Our gold-foil keepsake boxes became a Diwali and wedding favourite for families and corporates.",
  },
  {
    y: "2026",
    t: "Dryfruit Adda today",
    d: "10 dry-fruit staples, luxury hampers and bulk gifting — still sorted by hand, still family-run at heart.",
  },
];

export default function About() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-cocoa">
        <img
          src="https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/hero_PHRF6HPzu.jpg"
          alt="Brass bowls of almonds, cashews, pistachios and dates"
          className="absolute inset-0 h-full w-full object-cover object-right opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-cocoa via-cocoa/85 to-cocoa/20" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 sm:py-32">
          <nav className="text-xs uppercase tracking-[0.2em] text-cocoa-foreground/70">
            <Link href="/" className="hover:text-gold">
              Home
            </Link>{" "}
            / <span>About</span>
          </nav>
          <p className="mt-8 text-sm uppercase tracking-[0.35em] text-gold">Our Story</p>
          <h1 className="mt-4 max-w-3xl font-display text-6xl font-semibold leading-[1.02] text-cocoa-foreground sm:text-7xl lg:text-8xl">
            Luxury, <em className="text-gold">the natural way.</em>
          </h1>
          <p className="mt-6 max-w-xl text-xl leading-relaxed text-cocoa-foreground/80">
            Dryfruit Adda began with a simple idea: the dry fruits we share with family and gift on
            festivals should be the very best. We select each batch for size, taste and colour — and
            pack it like it&apos;s going to our own home.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/shop"
              className="rounded-md bg-gold px-8 py-4 text-sm font-medium uppercase tracking-widest text-cocoa transition hover:brightness-110"
            >
              Explore the collection
            </Link>
            <Link
              href="/contact"
              className="rounded-md border border-gold px-8 py-4 text-sm font-medium uppercase tracking-widest text-gold transition hover:bg-gold/10"
            >
              Bulk & gifting
            </Link>
          </div>
          <dl className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {stats.map((s) => (
              <div
                key={s.l}
                className="rounded-2xl border border-gold/25 bg-cocoa-foreground/5 p-6 text-center backdrop-blur"
              >
                <dt className="sr-only">{s.l}</dt>
                <dd className="font-display text-4xl font-semibold text-gold sm:text-5xl">{s.n}</dd>
                <dd className="mt-2 text-xs uppercase tracking-widest text-cocoa-foreground/70">
                  {s.l}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* Trust strip */}
      <div className="border-b border-gold/25 bg-cocoa-foreground/100 bg-[#F6F1E7]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-4 py-5 text-xs font-medium uppercase tracking-[0.2em] text-primary">
          <span>Hand-sorted</span>
          <span className="text-gold">✦</span>
          <span>Small batches</span>
          <span className="text-gold">✦</span>
          <span>Festive-ready packing</span>
          <span className="text-gold">✦</span>
          <span>Pan-India delivery</span>
        </div>
      </div>

      {/* Story split */}
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:py-28 lg:grid-cols-2">
        <div className="grid grid-cols-2 gap-4">
          <img
            src="https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/mixed_Cb6n5_mP1.jpg"
            alt="Mixed dry fruits"
            loading="lazy"
            className="aspect-[3/4] w-full rounded-2xl border border-gold/30 object-cover shadow-xl"
          />
          <img
            src="https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/gift_JYpveUrx4.jpg"
            alt="Signature gift box"
            loading="lazy"
            className="mt-10 aspect-[3/4] w-full rounded-2xl border border-gold/30 object-cover shadow-xl"
          />
        </div>
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gold">From our family to yours</p>
          <h2 className="mt-3 font-display text-5xl font-semibold leading-tight text-primary sm:text-6xl">
            An adda where quality comes first.
          </h2>
          <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
            &quot;Adda&quot; is where people gather — over chai, stories and a bowl of something good. Our
            adda started at family functions, where guests always asked:{" "}
            <em>where did you get these cashews?</em>
          </p>
          <p className="mt-4 leading-relaxed text-muted-foreground">
            From everyday soaked almonds to grand wedding hampers, every pack carries the same
            promise: hand-sorted kernels, honest weights and festive-ready packing. No shortcuts, no
            mixing grades.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm">
            {[
              "Hand-sorted for size, colour and taste",
              "Honest weights — what the pack says is what you get",
              "Festive-ready packing for gifting and weddings",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-gold/15 text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Values */}
      <section className="bg-secondary py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-center text-sm uppercase tracking-[0.3em] text-gold">
            What we stand for
          </p>
          <h2 className="mx-auto mt-3 max-w-2xl text-center font-display text-5xl font-semibold text-primary sm:text-6xl">
            Our promise in every pack
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-lg text-muted-foreground">
            Four things we never compromise on — whether it is a small everyday pack or a grand
            wedding hamper.
          </p>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {values.map(({ icon: I, t, d }) => (
              <div key={t} className="rounded-xl border border-gold/30 bg-card p-6">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-primary">
                  <I className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-display text-2xl font-semibold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <p className="text-sm uppercase tracking-[0.3em] text-gold">How it works</p>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <h2 className="max-w-xl font-display text-5xl font-semibold leading-tight text-primary sm:text-6xl">
            From mandi to your door
          </h2>
          <Link
            href="/shop"
            className="border-b border-primary pb-1 text-sm uppercase tracking-widest text-primary"
          >
            Taste the difference
          </Link>
        </div>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="relative rounded-xl border border-border bg-card p-6">
              <span className="font-display text-5xl font-semibold text-gold/40">{s.n}</span>
              <h3 className="mt-2 font-display text-2xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.d}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 overflow-hidden rounded-xl border border-gold/30">
          <img
            src="https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/almonds_UOTtyTDyL.jpg"
            alt="Premium California almonds"
            loading="lazy"
            className="h-56 w-full object-cover sm:h-72"
          />
        </div>
      </section>

      {/* Timeline */}
      <section className="bg-cocoa py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm uppercase tracking-[0.3em] text-gold">Our journey</p>
          <h2 className="mt-3 font-display text-5xl font-semibold text-cocoa-foreground sm:text-6xl">
            Small adda, big dreams
          </h2>
          <p className="mt-4 max-w-xl text-lg text-cocoa-foreground/70">
            From a small kitchen shelf to 120+ cities — this journey was built on your trust.
          </p>
          <ol className="mt-12 grid gap-5 md:grid-cols-4">
            {timeline.map((t) => (
              <li key={t.y} className="rounded-xl border border-gold/25 bg-cocoa-foreground/5 p-6">
                <p className="font-display text-3xl font-semibold text-gold">{t.y}</p>
                <h3 className="mt-2 font-display text-2xl text-cocoa-foreground">{t.t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-cocoa-foreground/70">{t.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Reviews + CTA */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:py-28">
        <div className="grid gap-5 rounded-3xl border border-gold/30 bg-card p-10 text-center shadow-xl sm:p-16">
          <div className="mx-auto flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className="h-5 w-5 fill-gold text-gold" />
            ))}
          </div>
          <blockquote className="mx-auto max-w-2xl font-display text-2xl italic leading-snug sm:text-3xl">
            &quot;The gift box looked so beautiful that guests thought it was imported. The cashews were
            huge and creamy.&quot;
          </blockquote>
          <p className="text-sm text-muted-foreground">— Priya S., Mumbai · Verified buyer</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Link
              href="/shop?group=gift-hampers"
              className="flex items-center gap-2 rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
            >
              <Gift className="h-4 w-4" /> Shop gift hampers
            </Link>
            <Link
              href="/contact"
              className="flex items-center gap-2 rounded-md border border-input px-6 py-3 text-sm hover:border-gold"
            >
              <Truck className="h-4 w-4" /> Plan bulk gifting
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
