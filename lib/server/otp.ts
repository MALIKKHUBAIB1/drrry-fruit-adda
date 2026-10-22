import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { updateDb } from "./db";
import { sendEmail, wrapEmail } from "./mailer";

export type OtpPurpose = "login" | "register";

const TTL_MS = 10 * 60 * 1000; // 10 minute valid
const MAX_ATTEMPTS = 5; // 5 galat try = code jal jao
const PRUNE_MS = 60 * 60 * 1000; // consume ke baad bhi 1ghanta history

function codeHash(code: string): string {
  return createHash("sha256").update((process.env.OTP_PEPPER ?? "") + code).digest("hex");
}

export function newOtpCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

/**
 * Naya code issue karo (purane email ka purana code overwrite). Plaintext
 * sirf caller ko — DB me sirf hash jata hai.
 */
export async function issueOtp(email: string, purpose: OtpPurpose): Promise<string> {
  const code = newOtpCode();
  const now = Date.now();
  await updateDb((d) => {
    d.otps = d.otps.filter(
      (o) => o.id !== email && new Date(o.createdAt).getTime() > now - PRUNE_MS,
    );
    d.otps.push({
      id: email,
      codeHash: codeHash(code),
      purpose,
      attempts: 0,
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + TTL_MS).toISOString(),
    });
  });
  // Prod me code log kabhi nahi — dev me testing ke liye (devCode response me
  // bhi sirf NODE_ENV !== production par jata hai).
  if (process.env.NODE_ENV !== "production") {
    console.log(JSON.stringify({ level: "info", msg: "otp issued", email, purpose, code }));
  }
  return code;
}

export type OtpCheck =
  | { ok: true; purpose: OtpPurpose }
  | { ok: false; reason: "missing" | "invalid" };

/** Code verify — timing-safe compare, har galat try attempts badhata hai. */
export async function checkOtp(email: string, code: string): Promise<OtpCheck> {
  const clean = code.replace(/\D/g, "");
  const expected = Buffer.from(codeHash(clean), "hex");
  let out: OtpCheck = { ok: false, reason: "missing" };
  await updateDb((d) => {
    const rec = d.otps.find((o) => o.id === email);
    if (!rec) return;
    if (new Date(rec.expiresAt).getTime() < Date.now() || rec.attempts >= MAX_ATTEMPTS) {
      d.otps = d.otps.filter((o) => o.id !== email);
      out = { ok: false, reason: "invalid" };
      return;
    }
    const actual = Buffer.from(rec.codeHash, "hex");
    const match = actual.length === expected.length && timingSafeEqual(actual, expected);
    if (match) {
      out = { ok: true, purpose: rec.purpose };
      return;
    }
    rec.attempts += 1;
    if (rec.attempts >= MAX_ATTEMPTS) d.otps = d.otps.filter((o) => o.id !== email);
    out = { ok: false, reason: "invalid" };
  });
  return out;
}

/** Successful verify ke baad code hatao — ek hi baar chale. */
export async function consumeOtp(email: string): Promise<void> {
  await updateDb((d) => {
    d.otps = d.otps.filter((o) => o.id !== email);
  });
}

/** OTP email — branded wrapper ke saath. */
export async function sendOtpEmail(email: string, code: string) {
  const html = wrapEmail(
    "Your sign-in code",
    `<p style="margin:0 0 18px">Enter this 6-digit code to finish signing in to Dryfruit Adda:</p>
     <p style="margin:0 0 18px;font-size:34px;font-weight:700;letter-spacing:.4em;text-align:center;padding:16px;background:#faf6ee;border:1px dashed #d4a24c;border-radius:12px">${code}</p>
     <p style="margin:0;color:#8a7d6d;font-size:13px">The code is valid for 10 minutes. If you didn't request this, you can safely ignore this email.</p>`,
  );
  return sendEmail({
    to: email,
    subject: `Your Dryfruit Adda code: ${code}`,
    html,
    text: `Your Dryfruit Adda verification code: ${code}. Valid for 10 minutes.`,
  });
}
