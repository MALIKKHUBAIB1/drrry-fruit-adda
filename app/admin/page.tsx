import type { Metadata } from "next";
import { Suspense } from "react";
import AdminContent from "./AdminContent";

export const metadata: Metadata = {
  title: "Admin Dashboard | Dryfruit Adda",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="py-16 text-center text-sm text-muted-foreground">Loading dashboard…</p>}>
      <AdminContent />
    </Suspense>
  );
}
