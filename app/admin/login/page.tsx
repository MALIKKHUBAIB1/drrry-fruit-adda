"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, ShieldAlert } from "lucide-react";
import { useAuth } from "@/lib/auth";

export default function AdminLoginPage() {
  const { user, login, logout } = useAuth();
  const router = useRouter();
  // Credentials kabhi client bundle me nahi — sirf user type kare.
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [show, setShow] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.isAdmin) router.replace("/admin");
  }, [user, router]);

  useEffect(() => {
    if (user && !user.isAdmin) logout();
  }, [user, logout]);

  if (user?.isAdmin) return null;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
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
  };

  return (
    <div className="min-h-screen bg-cocoa">
      <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-4 py-12">
        <Link href="/" className="mb-8 flex items-center gap-3">
          <span className="grid h-12 w-12 place-items-center rounded-full bg-gold font-display text-2xl font-bold text-cocoa">
            D
          </span>
          <span>
            <span className="block font-display text-xl font-semibold text-cocoa-foreground">Dryfruit Adda</span>
            <span className="block text-[11px] uppercase tracking-[0.25em] text-gold">Admin Panel</span>
          </span>
        </Link>

        <div className="w-full rounded-2xl border border-gold/30 bg-cocoa-foreground/5 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-gold/20 text-gold">
              <ShieldAlert className="h-6 w-6" />
            </span>
            <h1 className="mt-3 font-display text-3xl font-semibold text-cocoa-foreground">Admin Login</h1>
            <p className="mt-1 text-sm text-cocoa-foreground/70">Restricted area — admins only.</p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <label className="block text-sm font-medium text-cocoa-foreground">
              Email
              <span className="relative mt-1.5 block">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-foreground/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@dryfruitadda.in"
                  autoComplete="email"
                  required
                  minLength={5}
                  maxLength={254}
                  className="w-full rounded-md border border-gold/30 bg-cocoa-foreground/10 px-3 py-2.5 pl-10 text-sm text-cocoa-foreground outline-none placeholder:text-cocoa-foreground/40 focus:border-gold"
                />
              </span>
            </label>
            <label className="block text-sm font-medium text-cocoa-foreground">
              <span className="flex items-center justify-between">
                Password
                <span className="text-xs font-normal text-cocoa-foreground/50">Min 6 characters</span>
              </span>
              <span className="relative mt-1.5 block">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cocoa-foreground/40" />
                <input
                  type={show ? "text" : "password"}
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  minLength={6}
                  maxLength={128}
                  className="w-full rounded-md border border-gold/30 bg-cocoa-foreground/10 px-3 py-2.5 pl-10 pr-10 text-sm text-cocoa-foreground outline-none placeholder:text-cocoa-foreground/40 focus:border-gold"
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  onClick={() => setShow((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cocoa-foreground/40 hover:text-gold"
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
            {err && (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-red-200">
                {err}
              </p>
            )}
            <button
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-gold py-3.5 font-semibold text-cocoa transition hover:brightness-110 active:scale-[0.99] disabled:opacity-60"
            >
              {busy ? "Logging in…" : "Login to Admin"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-cocoa-foreground/50">
            Not an admin?{" "}
            <Link href="/login" className="font-medium text-gold hover:underline">
              User login →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
