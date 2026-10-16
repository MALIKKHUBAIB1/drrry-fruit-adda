import type { Metadata } from "next";
import AccountContent from "./AccountContent";

export const metadata: Metadata = { title: "My Account | Dryfruit Adda", robots: { index: false, follow: false } };

export default function AccountPage() {
  return <AccountContent />;
}
