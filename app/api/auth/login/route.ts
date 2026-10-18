import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import {
  newToken,
  publicUser,
  sessionCookie,
  sessionExpiry,
  verifyPassword,
} from "@/lib/server/auth";
import { cleanText, clientIp, isValidEmail, rateLimit, readJsonSafe, sameOrigin } from "@/lib/server/security";

// POST /api/auth/login { email, password }
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  // Rate limit: XFF spoof-proof — bucket email + remote address dono pe.
  // Authenticated hone se pehle user id available nahi hoti, isliye email key
  // use karte hain (attacker email badal sakta hai, but per-email limit still
  // stops targeted brute force on one account).
  const ip = clientIp(req);
  const rlIp = rateLimit(`login-ip:${ip}`, 30, 60_000);
  if (!rlIp.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(body.password ?? "");

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }
  if (!password) {
    return NextResponse.json({ error: "Enter your password." }, { status: 400 });
  }

  const db = await readDb();
  const rlAcct = rateLimit(`login-acct:${email}`, 10, 15 * 60_000);
  if (!rlAcct.ok) {
    return NextResponse.json(
      { error: "Too many attempts for this account. Try again later." },
      { status: 429 },
    );
  }

  const user = db.users.find((u) => u.email === email);
  // Enumeration fix: unknown email aur wrong password ka response IDENTICAL
  // hona chahiye (same status, same message).
  if (!user || !verifyPassword(password, user.salt, user.passHash)) {
    return NextResponse.json({ error: "Wrong password. Please try again." }, { status: 401 });
  }

  const token = newToken();
  const expiresAt = sessionExpiry();
  await updateDb((d) => {
    d.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString(), expiresAt });
  });

  const res = NextResponse.json({ user: publicUser(user) });
  res.headers.set("Set-Cookie", sessionCookie(token, expiresAt));
  return res;
}
