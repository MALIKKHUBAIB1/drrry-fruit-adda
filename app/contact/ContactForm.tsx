"use client";

import { useState } from "react";

export default function ContactForm({ labelCls, inputCls }: { labelCls: string; inputCls: string }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (sent) {
    return (
      <div className="mt-12 max-w-xl">
        <p className="font-display text-3xl italic text-primary">
          Thank you — message received.
        </p>
        <p className="mt-2 text-sm text-foreground/60">
          We&apos;ll reply within one working day.
        </p>
        <button
          onClick={() => setSent(false)}
          className="mt-6 border border-foreground/25 px-6 py-2.5 text-xs uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setBusy(true);
        setErr(null);
        try {
          const res = await fetch("/api/contact", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: fd.get("name"),
              email: fd.get("email"),
              phone: fd.get("phone"),
              message: fd.get("message"),
            }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.error || "Message send nahi ho paya.");
          setSent(true);
        } catch (e) {
          setErr(e instanceof Error ? e.message : "Message send nahi ho paya.");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-12 max-w-xl space-y-7"
    >
      <label className={labelCls}>
        Name
        <input required name="name" autoComplete="name" minLength={2} maxLength={80} className={inputCls} />
      </label>
      <label className={labelCls}>
        Email
        <input required name="email" type="email" autoComplete="email" minLength={5} maxLength={254} className={inputCls} />
      </label>
      <label className={labelCls}>
        Phone
        <input name="phone" autoComplete="tel" inputMode="numeric" maxLength={10} pattern="[6-9][0-9]{9}" className={inputCls} />
      </label>
      <label className={labelCls}>
        Message
        <textarea required name="message" rows={5} minLength={5} maxLength={2000} className={`${inputCls} resize-y`} />
      </label>
      {err && (
        <p role="alert" className="text-sm text-destructive">
          {err}
        </p>
      )}
      <button
        disabled={busy}
        className="bg-primary px-10 py-3.5 text-xs font-medium uppercase tracking-[0.25em] text-primary-foreground transition hover:bg-cocoa disabled:opacity-60"
      >
        {busy ? "Sending…" : "Send Message"}
      </button>
    </form>
  );
}
