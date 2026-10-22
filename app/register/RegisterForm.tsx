"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Mail, Smartphone, User as UserIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { AuthLayout, authInput } from "@/components/site/AuthLayout";
import { OtpEntry } from "@/components/site/OtpEntry";

const mobileInput = authInput.replace("pl-10", "pl-14");

function normalizeMobile(raw: string) {
  return raw.replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
}

export default function RegisterForm() {
  const { user, sendOtp, verifyOtp } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? undefined;
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState<"form" | "otp">("form");
  const [devCode, setDevCode] = useState<string | undefined>(undefined);
  const [resendIn, setResendIn] = useState(0);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) router.replace(redirect ?? "/account");
  }, [user, redirect, router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  if (user) return null;

  const validate = () => {
    if (name.trim().length < 3) return "Please enter your full name.";
    if (!/^[6-9]\d{9}$/.test(normalizeMobile(mobile))) {
      return "Enter a valid 10-digit mobile number.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return "Enter a valid email address.";
    }
    return null;
  };

  const requestOtp = async (e?: FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    const invalid = validate();
    if (invalid) {
      setErr(invalid);
      return;
    }
    setBusy(true);
    setErr(null);
    const r = await sendOtp(email.trim().toLowerCase(), "register");
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
    const r = await sendOtp(email.trim().toLowerCase(), "register");
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
    const msg = await verifyOtp({
      email: email.trim().toLowerCase(),
      code: otp,
      name: name.trim(),
      mobile: normalizeMobile(mobile),
    });
    setBusy(false);
    if (msg) {
      setErr(msg);
      return;
    }
    router.push(redirect ?? "/account");
  };

  return (
    <AuthLayout
      eyebrow="Join Dryfruit Adda"
      title="Create account"
      subtitle="One account for faster checkout, wishlist and festive offers."
      switchText="Already have an account?"
      switchLink="/login"
      switchLabel="Login"
      switchSearch={redirect ? { redirect } : undefined}
      image="https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/gift_JYpveUrx4.jpg"
    >
      {stage === "form" ? (
        <form noValidate onSubmit={requestOtp} className="space-y-4">
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
            Mobile number
            <span className="relative mt-1.5 block">
              <Smartphone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/35" />
              <input
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/[^\d\s]/g, "").slice(0, 12))}
                placeholder="98765 43210"
                autoComplete="tel-national"
                inputMode="numeric"
                required
                maxLength={12}
                className={mobileInput}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-medium text-foreground/40">
                +91
              </span>
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
          <button
            disabled={busy}
            className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-medium text-primary-foreground transition hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60"
          >
            {busy ? "Sending code…" : "Send OTP"}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
          <p className="text-center text-xs text-muted-foreground">
            We&apos;ll email you a 6-digit code to verify — no password needed.
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
            setStage("form");
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
