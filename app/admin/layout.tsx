import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminShell } from "./AdminShell";

export const metadata: Metadata = {
  title: "Admin Dashboard | Dryfruit Adda",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<p className="py-16 text-center text-sm text-muted-foreground">Loading…</p>}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
