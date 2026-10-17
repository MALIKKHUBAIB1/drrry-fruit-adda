import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import {
  newToken,
  publicUser,
  sessionCookie,
  sessionExpiry,
  verifyPassword,
} from "@/lib/server/auth";
import {
  cleanText,
  isValidEmail,
  rateLimit,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

// POST /api/auth/login { email, password }
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`login:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
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
  const user = db.users.find((u) => u.email === email);
  if (!user) {
    return NextResponse.json(
      { error: "No account found with this email. Please register first." },
      { status: 404 },
    );
  }
  if (!verifyPassword(password, user.salt, user.passHash)) {
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
