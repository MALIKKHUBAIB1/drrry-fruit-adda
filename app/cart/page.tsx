import type { Metadata } from "next";
import CartContent from "./CartContent";

export const metadata: Metadata = {
  title: "Your Cart | Dryfruit Adda",
  description: "Review the dry fruits and gift hampers in your cart.",
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return <CartContent />;
}
