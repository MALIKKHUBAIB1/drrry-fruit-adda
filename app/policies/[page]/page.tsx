import type { Metadata } from "next";
import { notFound } from "next/navigation";

const pages: Record<string, { title: string; description: string; body: string[] }> = {
  shipping: {
    title: "Shipping Policy",
    description: "We ship across India. Orders above ₹999 ship free, most orders dispatch within 1–2 working days.",
    body: [
      "We ship across India. Orders above ₹999 ship free. Below that, delivery is charged based on your PIN code zone: metro ₹49, tier-2 ₹69, tier-3 ₹89 and remote areas ₹119. Express and same-day options are available at checkout.",
      "Most orders are dispatched within 1–2 working days. You'll get a tracking link by SMS and email as soon as your order is shipped, and live status updates on the Track Order page.",
    ],
  },
  returns: {
    title: "Returns, Cancellation & Refund Policy",
    description: "Cancel before delivery, refunds in 5–7 working days for online payments, and easy returns for damaged orders.",
    body: [
      "We want every order to arrive fresh and perfect. Here's how cancellations, refunds and returns work.",

      "Cancelling your order — Cancel any time before the order goes Out for Delivery. Open Account → Orders, click the order and choose “Cancel order”. Orders that are Placed, Packed or Shipped can be cancelled directly. Once an order is Out for Delivery or Delivered it can no longer be cancelled, because it is already with the delivery partner.",

      "Refunds for online payments — If you paid online (UPI, card, net banking or wallet) and cancel before delivery, your refund is initiated immediately to the same account you paid from. Banks typically credit it in 5–7 working days. You'll see a “Refunded” badge on the order, and we'll email you the refund reference.",

      "Cash on Delivery orders — For COD, nothing is collected until delivery, so a cancelled COD order simply costs you nothing — there is no refund to wait for.",

      "If a refund can't be processed automatically, your order still stays cancelled and our team contacts you within 24 working hours to complete it manually. You can also reach us any time from the Contact page.",

      "Returns for damaged or incorrect items — As food products, items can be returned only if they arrive damaged, leaking or incorrect. Contact us within 48 hours of delivery with a photo, and we'll send a replacement or a full refund — whichever you prefer.",

      "Refund method — All refunds go back to the original payment method. We never issue refunds to a different account or as store credit unless you specifically ask for it.",
    ],
  },
  privacy: {
    title: "Privacy Policy",
    description: "We collect only the details needed to process and deliver your orders, and never sell your personal information.",
    body: [
      "We collect only the details needed to process and deliver your orders — your name, phone, delivery address, email and order history.",
      "We never sell or rent your personal information. Payment details are handled by Razorpay and never touch our servers. You can request deletion of your account and data any time from the Contact page.",
    ],
  },
  terms: {
    title: "Terms & Conditions",
    description: "By using this website you agree to our terms of sale. Prices and availability may change without notice.",
    body: [
      "By using this website you agree to our terms of sale. Prices and availability may change without notice.",
      "All images and product descriptions are for reference; natural dry fruits can vary slightly in size and colour between batches. Please see our Returns, Cancellation & Refund Policy for your rights on cancelled and damaged orders.",
    ],
  },
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
    description: p.description,
    openGraph: { title: `${p.title} | Dryfruit Adda`, description: p.description },
  };
}

export default async function PolicyPage({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  const p = pages[page];
  if (!p) notFound();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-5xl font-semibold text-primary">{p.title}</h1>
      <div className="mt-6 space-y-5">
        {p.body.map((para, i) => (
          <p key={i} className="leading-relaxed text-muted-foreground">
            {para}
          </p>
        ))}
      </div>
      <p className="mt-8 text-xs text-muted-foreground">
        Questions? <a href="/contact" className="text-primary underline">Contact us</a> — we usually reply within a few hours.
      </p>
    </div>
  );
}
