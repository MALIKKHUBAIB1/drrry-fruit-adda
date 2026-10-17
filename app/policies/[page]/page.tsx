import type { Metadata } from "next";
import { notFound } from "next/navigation";

const pages: Record<string, { title: string; body: string }> = {
  shipping: { title: "Shipping Policy", body: "We ship across India. Orders above ₹999 ship free. Below that, delivery is charged based on your PIN code zone: metro ₹49, tier-2 ₹69, tier-3 ₹89 and remote areas ₹119. Express and same-day options are available at checkout. Most orders are dispatched within 1–2 working days." },
  returns: { title: "Return & Refund Policy", body: "As food products, items can be returned only if they arrive damaged or incorrect. Contact us within 48 hours of delivery with photos and we'll make it right." },
  privacy: { title: "Privacy Policy", body: "We collect only the details needed to process and deliver your orders, and never sell your personal information." },
  terms: { title: "Terms & Conditions", body: "By using this website you agree to our terms of sale. Prices and availability may change without notice." },
};

export function generateStaticParams() {
  return Object.keys(pages).map((page) => ({ page }));
}

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }): Promise<Metadata> {
  const { page } = await params;
  const p = pages[page];
  if (!p) return { title: "Policy | Dryfruit Adda" };
  return {
    title: `${p.title} | Dryfruit Adda`,
    description: p.body.slice(0, 150),
    openGraph: { title: `${p.title} | Dryfruit Adda`, description: p.body.slice(0, 150) },
  };
}

export default async function PolicyPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const p = pages[page];
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-5xl font-semibold text-primary">{p.title}</h1>
      <p className="mt-6 leading-relaxed text-muted-foreground">{p.body}</p>
      <p className="mt-6 text-xs text-muted-foreground">Placeholder text — please replace with your final policy.</p>
    </div>
  );
}
