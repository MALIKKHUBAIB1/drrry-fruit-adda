"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void };
  }
}

let scriptPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Couldn't load Razorpay."));
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export function useRazorpay() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadRazorpayScript().then(() => setReady(true)).catch(() => setReady(false));
  }, []);
  return ready;
}

export type RazorpayResult = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

export async function openRazorpayCheckout(opts: {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  email: string;
  phone?: string;
  description?: string;
}): Promise<RazorpayResult> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error("Razorpay unavailable.");
  return new Promise<RazorpayResult>((resolve, reject) => {
    const rzp = new window.Razorpay!({
      key: opts.keyId,
      amount: opts.amount,
      currency: opts.currency,
      name: "Dryfruit Adda",
      description: opts.description ?? "Dry fruit order",
      order_id: opts.orderId,
      prefill: { name: opts.name, email: opts.email, contact: opts.phone },
      theme: { color: "#3a2e22" },
      handler: (res: RazorpayResult) => resolve(res),
      modal: { ondismiss: () => reject(new Error("Payment cancelled.")) },
    });
    rzp.open();
  });
}
