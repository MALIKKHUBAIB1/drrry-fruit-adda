import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb, type DbUser } from "@/lib/server/db";
import { checkOtp, consumeOtp } from "@/lib/server/otp";
import { newId, newToken, publicUser, sessionCookie, sessionExpiry } from "@/lib/server/auth";
import {
  cleanText,
  clientIp,
  isValidEmail,
  rateLimit,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

const GENERIC_ERR = "Invalid or expired code. Please request a new one.";

// POST /api/auth/otp/verify { email, code, name?, mobile? }
// Register flow: name+mobile zaroori (OTP record ka purpose decide karta hai,
// client ke bheje purpose par bharosa nahi). Login flow: session ban jata hai.
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const ip = clientIp(req);
  if (!rateLimit(`otp-verify-ip:${ip}`, 20, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const code = String(body.code ?? "").replace(/\D/g, "");

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (code.length !== 6) {
    return NextResponse.json({ error: "Enter the 6-digit code." }, { status: 400 });
  }

  if (!rateLimit(`otp-verify:${email}`, 10, 10 * 60_000).ok) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const db = await readDb();
  const rec = db.otps.find((o) => o.id === email);
  if (!rec) {
    return NextResponse.json({ error: GENERIC_ERR }, { status: 401 });
  }

  // Register purpose par naam+mobile validate karo — OTP check se pehle,
  // taaki galat format par code na jalaye.
  let name = "";
  let mobile = "";
  if (rec.purpose === "register") {
    name = cleanText(body.name, 80);
    const digits = String(body.mobile ?? "").replace(/\D/g, "").replace(/^91(?=\d{10}$)/, "");
    if (name.length < 3) {
      return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
    }
    if (!/^[6-9]\d{9}$/.test(digits)) {
      return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
    }
    mobile = digits;
  }

  const checked = await checkOtp(email, code);
  if (!checked.ok) {
    return NextResponse.json({ error: GENERIC_ERR }, { status: 401 });
  }

  await consumeOtp(email);

  const token = newToken();
  const expiresAt = sessionExpiry();
  let user: DbUser | undefined;
  let created = false;

  await updateDb((d) => {
    let u = d.users.find((x) => x.email === email);
    if (!u && checked.purpose === "register") {
      u = {
        id: newId("U-"),
        name,
        email,
        mobile,
        // Passwordless account — koi password kabhi verify nahi hoga.
        passHash: "",
        salt: "",
        isAdmin: false,
        createdAt: new Date().toISOString(),
      };
      d.users.push(u);
      created = true;
    }
    if (!u) return;
    d.sessions.push({ token, userId: u.id, createdAt: new Date().toISOString(), expiresAt });
    user = u;
  });

  if (!user) {
    return NextResponse.json({ error: GENERIC_ERR }, { status: 401 });
  }

  const res = NextResponse.json({ user: publicUser(user) }, { status: created ? 201 : 200 });
  res.headers.set("Set-Cookie", sessionCookie(token, expiresAt));
  return res;
}
