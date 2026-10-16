import type { Metadata } from "next";
import WishlistContent from "./WishlistContent";

export const metadata: Metadata = {
  title: "Your Wishlist | Dryfruit Adda",
  description: "Your saved dry fruits, nuts and gift hampers.",
  robots: { index: false, follow: false },
};

export default function WishlistPage() {
  return <WishlistContent />;
}
