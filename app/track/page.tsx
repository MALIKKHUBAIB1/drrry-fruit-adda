import type { Metadata } from "next";
import { OrderTracker } from "@/components/site/OrderTracker";

export const metadata: Metadata = {
  title: "Track Your Order | Dryfruit Adda",
  description:
    "Track your Dryfruit Adda order in real time using your order ID and email.",
  alternates: { canonical: "/track" },
};

export default function TrackPage() {
  return <OrderTracker />;
}