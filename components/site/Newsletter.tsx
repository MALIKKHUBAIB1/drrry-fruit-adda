"use client";

import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function NewsletterForm({ dark }: { dark?: boolean }) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!/^\S+@\S+\.\S+$/.test(email)) return toast.error("Please enter a valid email");
        setBusy(true);
        try {
          const res = await fetch("/api/newsletter", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const d = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(d.error || "Subscription failed.");
          toast.success(d.message || "Thanks for subscribing!");
          setEmail("");
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Subscription failed.");
        } finally {
          setBusy(false);
        }
      }}
      className="flex gap-2"
    >
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email" aria-label="Email address"
        className={cn("min-w-0 flex-1 rounded-md border px-3 py-2 text-sm outline-none focus:border-gold", dark ? "border-gold/40 bg-transparent text-cocoa-foreground placeholder:text-cocoa-foreground/50" : "border-input bg-background")} />
      <button disabled={busy} className="shrink-0 rounded-md bg-gold px-4 py-2 text-sm font-medium text-cocoa hover:opacity-90 disabled:opacity-60">{busy ? "…" : "Subscribe"}</button>
    </form>
  );
}
