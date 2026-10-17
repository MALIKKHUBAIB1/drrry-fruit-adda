"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthLayout, authInput } from "@/components/site/AuthLayout";

const DEV = process.env.NODE_ENV !== "production";
const DEV_EMAIL = "admin@dryfruitadda.in";
const DEV_PASS = "DFA-KB4aht9Z1Hwq5YJU-2026";

export default function LoginForm() {
  const { user, login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? undefined;
  const [email, setEmail] = useState(DEV ? DEV_EMAIL : "");
  const [pass, setPass] = useState(DEV ? DEV_PASS : "");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(redirect ?? "/account");
  }, [user, redirect, router]);

  if (user) return null;

  return (
    <AuthLayout
      eyebrow="Welcome back"
      title="Login"
      subtitle="Login for faster checkout, order tracking and your wishlist."
      switchText="New to Dryfruit Adda?"
      switchLink="/register"
      switchLabel="Create an account"
      switchSearch={redirect ? { redirect } : undefined}
    >
      <form
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            setErr("Enter a valid email address.");
            return;
          }
          if (!pass) {
            setErr("Enter your password.");
            return;
          }
          setBusy(true);
          setErr(null);
          const msg = await login(email, pass);
          setBusy(false);
          if (msg) setErr(msg);
          else router.push(redirect ?? "/account");
        }}
        className="space-y-4"
      >
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
          <span className="flex items-center justify-between">
            Password
            <span className="text-xs font-normal text-muted-foreground">Min 6 characters</span>
          </span>
          <span className="relative mt-1.5 block">
            <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
            <input
              type={show ? "text" : "password"}
              value={pass}
              onChange={(e) => setPass(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
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
        {DEV && (
          <p className="rounded-xl border border-gold/30 bg-gold/10 px-4 py-2.5 text-xs text-muted-foreground">
            Dev mode: credentials pre-filled (admin@dryfruitadda.in). Remove before production.
          </p>
        )}
        <button disabled={busy} className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-medium text-primary-foreground transition hover:bg-cocoa active:scale-[0.99] disabled:opacity-60">
          {busy ? "Logging in…" : "Login"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </button>
      </form>
    </AuthLayout>
  );
}
