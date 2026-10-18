"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { Footer } from "./Footer";
import { CartDrawer } from "./CartDrawer";

// Admin pages ka apna alag layout hota hai — website ka
// header/footer/cart wahan nahi dikhne chahiye.
export function Chrome({
  children,
  announcements,
}: {
  children: React.ReactNode;
  announcements?: string[];
}) {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return <>{children}</>;
  return (
    <>
      <Header announcements={announcements} />
      <main className="min-h-[60vh]">{children}</main>
      <Footer />
      <CartDrawer />
    </>
  );
}
