"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Mail } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthLayout, authInput } from "@/components/site/AuthLayout";
import { OtpEntry } from "@/components/site/OtpEntry";

export default function LoginForm() {
  const { user, sendOtp, verifyOtp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? undefined;
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"email" | "otp">("email");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [resendIn, setResendIn] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Admin email se user login nahi hoga — alag Admin Login page hai.
  const isAdminEmail = email.trim().toLowerCase() === "admin@dryfruitadda.in";

  useEffect(() => {
    if (user) router.replace(redirect ?? "/account");
  }, [user, redirect, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (user) return null;

  const requestOtp = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (isAdminEmail) {
      setErr("Admin account — please use the Admin Login page.");
      return;
    }
    const mail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) {
      setErr("Enter a valid email address.");
      return;
    }
    setBusy(true);
    setErr(null);
    const r = await sendOtp(mail, "login");
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setOtp("");
    setDevCode(r.devCode);
    setStage("otp");
    setResendIn(45);
  };

  const resend = async () => {
    if (resendIn > 0 || busy) return;
    setBusy(true);
    setErr(null);
    const r = await sendOtp(email.trim().toLowerCase(), "login");
    setBusy(false);
    if (!r.ok) {
      setErr(r.error);
      return;
    }
    setOtp("");
    setDevCode(r.devCode);
    setResendIn(45);
  };

  const verify = async () => {
    if (otp.length !== 6) {
      setErr("Enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setErr(null);
    const msg = await verifyOtp({ email: email.trim().toLowerCase(), code: otp });
    setBusy(false);
    if (msg) {
      setErr(msg);
      return;
    }
    router.push(redirect ?? "/account");
  };

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
      {stage === "email" ? (
        <form noValidate onSubmit={requestOtp} className="space-y-4">
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
          <button
            disabled={busy}
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-medium text-primary-foreground transition hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "Sending code…" : "Send OTP"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="text-center text-xs text-muted-foreground">
            We&apos;ll email you a 6-digit code — no password needed.
          </p>
        </form>
      ) : (
        <OtpEntry
          email={email}
          value={otp}
          onChange={(v) => {
            setOtp(v);
            if (err) setErr(null);
          }}
          onSubmit={verify}
          onBack={() => {
            setStage("email");
            setOtp("");
            setErr(null);
          }}
          onResend={resend}
          resendIn={resendIn}
          busy={busy}
          devCode={devCode}
        />
      )}
      {err && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive"
        >
          {err}
        </p>
      )}
    </AuthLayout>
  );
}
