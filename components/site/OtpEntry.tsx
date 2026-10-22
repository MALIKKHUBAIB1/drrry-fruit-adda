"use client";

import { useRef, type ClipboardEvent } from "react";
import { ArrowRight, Loader2 } from "lucide-react";

// 6-digit OTP entry — auto-advance, backspace aur paste support ke saath.
export function OtpEntry({
  email,
  value,
  onChange,
  onSubmit,
  onBack,
  onResend,
  resendIn,
  busy,
  devCode,
}: {
  email: string;
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onBack: () => void;
  onResend: () => void;
  resendIn: number;
  busy: boolean;
  devCode?: string | undefined;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: 6 }, (_, i) => value[i] ?? "");

  const setAt = (i: number, ch: string) => {
    const arr = [...digits];
    arr[i] = ch;
    onChange(arr.join("").replace(/\D/g, "").slice(0, 6));
  };

  const onPaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted) {
      onChange(pasted);
      refs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="space-y-4"
    >
      <p className="text-sm text-muted-foreground">
        We sent a 6-digit code to <b className="text-foreground">{email}</b>. It&apos;s valid for
        10 minutes.
      </p>
      <div className="flex justify-between gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            value={d}
            inputMode="numeric"
            autoComplete={i === 0 ? "one-time-code" : "off"}
            maxLength={1}
            aria-label={`Digit ${i + 1}`}
            onChange={(e) => {
              const ch = e.target.value.replace(/\D/g, "").slice(-1);
              setAt(i, ch);
              if (ch && i < 5) refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowLeft" && i > 0) refs.current[i - 1]?.focus();
              if (e.key === "ArrowRight" && i < 5) refs.current[i + 1]?.focus();
            }}
            onPaste={onPaste}
            className="h-12 w-full min-w-0 rounded-xl border border-[#E4DDCD] bg-[#FDFCF9] text-center text-lg font-semibold outline-none transition focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
          />
        ))}
      </div>
      {devCode && (
        <div className="rounded-xl border border-gold/30 bg-gold/10 p-3 text-xs">
          <span className="font-semibold uppercase tracking-wider text-gold">Dev OTP</span>{" "}
          <span className="font-mono">{devCode}</span>{" "}
          <button
            type="button"
            onClick={() => onChange(devCode)}
            className="font-medium text-primary underline"
          >
            fill
          </button>
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={onBack}
          className="text-muted-foreground transition hover:text-foreground"
        >
          ← Change email
        </button>
        {resendIn > 0 ? (
          <span className="text-muted-foreground">Resend in {resendIn}s</span>
        ) : (
          <button
            type="button"
            onClick={onResend}
            disabled={busy}
            className="font-medium text-primary transition hover:underline disabled:opacity-60"
          >
            Resend code
          </button>
        )}
      </div>
      <button
        disabled={busy || value.length !== 6}
        className="group flex w-full items-center justify-center gap-2 rounded-full bg-primary py-3.5 font-medium text-primary-foreground transition hover:bg-primary-hover active:scale-[0.99] disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Verifying…
          </>
        ) : (
          <>
            Verify &amp; continue
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
