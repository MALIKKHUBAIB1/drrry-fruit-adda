import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { issueOtp, sendOtpEmail, type OtpPurpose } from "@/lib/server/otp";
import { clientIp, isValidEmail, rateLimit, readJsonSafe, sameOrigin } from "@/lib/server/security";

// POST /api/auth/otp/send { email, purpose: "login" | "register" }
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const ip = clientIp(req);
  if (!rateLimit(`otp-send-ip:${ip}`, 15, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const purpose: OtpPurpose = body.purpose === "register" ? "register" : "login";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!rateLimit(`otp-send:${email}`, 3, 10 * 60_000).ok) {
    return NextResponse.json(
      { error: "Too many OTP requests for this email. Try again in a few minutes." },
      { status: 429 },
    );
  }

  const db = await readDb();
  const user = db.users.find((u) => u.email === email);
  // Register par email pehle se maujood? Purpose silent "login" — response same
  // rahega (enumeration nahi) aur user OTP ke baad usi account me login ho jayega.
  const eff: OtpPurpose = purpose === "register" && user ? "login" : purpose;

  let devCode: string | undefined;
  if (purpose === "login" && !user) {
    // Enumeration guard: unknown email par bhi identical response jaata hai.
    // Andar kuch issue/send nahi hota — response content se existence leak nahi.
  } else {
    const code = await issueOtp(email, eff);
    const sent = await sendOtpEmail(email, code);
    if (!sent.ok) {
      // Fail par bhi 200 — status se user-existence ka oracle na bane. Domain
      // verify hone tak customer emails yahin aate hain (logs me dikhega).
      console.error(
        JSON.stringify({ level: "error", msg: "otp email failed", email, error: sent.error }),
      );
    }
    if (process.env.NODE_ENV !== "production") devCode = code;
  }

  return NextResponse.json({
    ok: true,
    message: "OTP sent to your email address.",
    ...(devCode ? { devCode } : {}),
  });
}
