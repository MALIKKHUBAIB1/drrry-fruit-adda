"use client";

import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { StoreProvider } from "@/lib/store";
import { AuthProvider } from "@/lib/auth";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <AuthProvider>
        {children}
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </StoreProvider>
  );
}
