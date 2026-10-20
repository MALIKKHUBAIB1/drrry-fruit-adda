import Link from "next/link";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { NewsletterForm } from "./Newsletter";

export function Footer() {
  return (
    <footer className="bg-cocoa text-cocoa-foreground">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <img src="https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/logo-sm_8aov28_Ti.jpg" alt="Dryfruit Adda" width={72} height={72} className="h-18 w-18 rounded-full ring-1 ring-gold" loading="lazy" />
          <p className="mt-4 text-sm leading-relaxed text-cocoa-foreground/75">Handpicked premium dry fruits, nuts and gift hampers — luxury in every bite, delivered across India.</p>
          <div className="mt-4 flex gap-3 text-gold">
            <a href="#" aria-label="Instagram"><Instagram className="h-5 w-5" /></a>
            <a href="#" aria-label="Facebook"><Facebook className="h-5 w-5" /></a>
            <a href="#" aria-label="YouTube"><Youtube className="h-5 w-5" /></a>
          </div>
        </div>
        <div>
          <h3 className="mb-4 font-display text-xl text-gold">Shop</h3>
          <ul className="space-y-2 text-sm text-cocoa-foreground/80">
            <li><Link href="/shop?group=dry-fruits">Dry Fruits</Link></li>
            <li><Link href="/shop?group=nuts-seeds">Nuts & Seeds</Link></li>
            <li><Link href="/shop?group=dates-figs">Dates & Figs</Link></li>
            <li><Link href="/shop?group=gift-hampers">Gift Hampers</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-display text-xl text-gold">Help</h3>
          <ul className="space-y-2 text-sm text-cocoa-foreground/80">
            <li><Link href="/about">About Us</Link></li>
            <li><Link href="/track">Track Your Order</Link></li>
            <li><Link href="/contact">Contact Us</Link></li>
            <li><Link href="/policies/shipping">Shipping Policy</Link></li>
            <li><Link href="/policies/returns">Return & Refund Policy</Link></li>
            <li><Link href="/policies/privacy">Privacy Policy</Link></li>
            <li><Link href="/policies/terms">Terms & Conditions</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="mb-4 font-display text-xl text-gold">Stay in touch</h3>
          <p className="mb-3 text-sm text-cocoa-foreground/75">Offers, new arrivals and festive gifting ideas.</p>
          <NewsletterForm dark />
          <div className="mt-5 flex flex-wrap gap-2 text-[11px] uppercase tracking-wider">
            {["UPI", "Visa", "Mastercard", "RuPay", "COD"].map((m) => <span key={m} className="rounded border border-gold/40 px-2 py-1 text-gold">{m}</span>)}
          </div>
        </div>
      </div>
      <p className="border-t border-gold/20 py-5 text-center text-xs text-cocoa-foreground/60">© {new Date().getFullYear()} Dryfruit Adda. All rights reserved.</p>
    </footer>
  );
}
