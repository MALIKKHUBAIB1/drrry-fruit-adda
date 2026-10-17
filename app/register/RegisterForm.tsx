"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthLayout, authInput } from "@/components/site/AuthLayout";

export default function RegisterForm() {
  const { user, register } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? undefined;
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(redirect ?? "/account");
  }, [user, redirect, router]);

  if (user) return null;

  return (
    <AuthLayout
      eyebrow="Join Dryfruit Adda"
      title="Create account"
      subtitle="One account for faster checkout, wishlist and festive offers."
      switchText="Already have an account?"
      switchLink="/login"
      switchLabel="Login"
      switchSearch={redirect ? { redirect } : undefined}
      image="/images/gift.jpg"
    >
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (name.trim().length < 3) {
            setErr("Please enter your full name.");
            return;
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setErr("Enter a valid email address.");
            return;
          }
          if (pass.length < 6) {
            setErr("Password must be at least 6 characters.");
            return;
          }
          setBusy(true);
          setErr(null);
          const msg = await register(name, email, pass);
          setBusy(false);
          if (msg) setErr(msg);
          else router.push(redirect ?? "/account");
        }}
        className="space-y-4"
      >
        <label className="block text-sm font-medium">
          Full name
          <span className="relative mt-1.5 block">
            <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Aarav Sharma"
              autoComplete="name"
              required
              minLength={3}
              maxLength={80}
              className={authInput}
            />
          </span>
        </label>
        <label className="block text-sm font-medium">
          Email
          <span className="relative mt-1.5 block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              minLength={5}
              maxLength={254}
              className={authInput}
            />
          </span>
        </label>
        <label className="block text-sm font-medium">
          Password
          <span className="relative mt-1.5 block">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
            <input
              type={show ? "text" : "password"}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="Min 6 characters"
              autoComplete="new-password"
              required
              minLength={6}
              maxLength={128}
              className={authInput}
            />
            <button
              type="button"
              aria-label={show ? "Hide password" : "Show password"}
              onClick={() => setShow((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/40 hover:text-primary"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </span>
        </label>
        {err && (
          <p
            role="alert"
            className="rounded-xl border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive"
          >
            {err}
          </p>
        )}
        <button disabled={busy} className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-medium text-primary-foreground transition hover:bg-cocoa active:scale-[0.99] disabled:opacity-60">
          {busy ? "Creating…" : "Create account"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>
    </AuthLayout>
  );
}
