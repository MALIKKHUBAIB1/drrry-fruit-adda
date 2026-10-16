import type { Metadata } from "next";
import { AtSign, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact Us | Dryfruit Adda",
  description: "Get in touch with Dryfruit Adda — bulk orders, gifting queries and support.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "Contact Dryfruit Adda",
    description: "Bulk orders, gifting queries and support — we reply within one working day.",
  },
};

const labelCls = "block text-[11px] font-medium uppercase tracking-[0.25em] text-foreground/60";
const inputCls =
  "mt-2.5 w-full border border-foreground/20 bg-white px-4 py-3.5 text-[15px] outline-none transition placeholder:text-foreground/30 focus:border-primary";

export default function Contact() {
  return (
    <div className="bg-[#F6F1E7]">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-14 sm:py-20 lg:grid-cols-[1fr_380px]">
        {/* Left — form like reference */}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-foreground/60">
            Contact
          </p>
          <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] text-primary sm:text-6xl">
            Let&apos;s Talk Dry Fruits
          </h1>

          <ContactForm labelCls={labelCls} inputCls={inputCls} />
        </div>

        {/* Right — reach us card like reference */}
        <aside className="h-fit border border-foreground/20 p-8 lg:mt-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-foreground/60">
            Reach us
          </p>
          <ul className="mt-6 space-y-5 text-[15px]">
            <li className="flex items-center gap-3">
              <AtSign className="h-[18px] w-[18px] shrink-0 text-foreground/60" />
              @dryfruit.adda
            </li>
            <li>
              <a href="tel:+910000000000" className="flex items-center gap-3 hover:text-primary">
                <Phone className="h-[18px] w-[18px] shrink-0 text-foreground/60" />
                WhatsApp +91 00000 00000
              </a>
            </li>
            <li>
              <a
                href="mailto:hello@dryfruitadda.in"
                className="flex items-center gap-3 hover:text-primary"
              >
                <Mail className="h-[18px] w-[18px] shrink-0 text-foreground/60" />
                hello@dryfruitadda.in
              </a>
            </li>
            <li className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-[18px] w-[18px] shrink-0 text-foreground/60" />
              <span>
                123 Market Road, Khari Baoli,
                <br />
                New Delhi 110006
              </span>
            </li>
            <li className="flex items-center gap-3">
              <MessageCircle className="h-[18px] w-[18px] shrink-0 text-foreground/60" />
              Mon–Sat · 10am–7pm
            </li>
          </ul>
          <p className="mt-8 font-display text-2xl italic text-[#B08080]">
            Packed with love, from nature
          </p>
        </aside>
      </div>
    </div>
  );
}
