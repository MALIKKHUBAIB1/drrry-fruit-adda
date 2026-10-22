import { NextResponse } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import {
  hashPassword,
  newId,
  newToken,
  publicUser,
  sessionCookie,
  sessionExpiry,
} from "@/lib/server/auth";
import { cleanText, clientIp, isValidEmail, rateLimit, readJsonSafe, sameOrigin } from "@/lib/server/security";

// POST /api/auth/register { name, email, password }
export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const ip = clientIp(req);
  const rl = rateLimit(`register:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many attempts. Please try again later." }, { status: 429 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const name = cleanText(body.name, 80);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const password = String(body.password ?? "");

  if (name.length < 3)
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  if (!isValidEmail(email))
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 6 || password.length > 128)
    return NextResponse.json(
      { error: "Password must be 6–128 characters." },
      { status: 400 },
    );

  const existing = (await readDb()).users.find((u) => u.email === email);
  if (existing) {
    return NextResponse.json(
      { error: "This email is already registered. Please login." },
      { status: 409 },
    );
  }

  const { salt, hash } = hashPassword(password);
  const user = { id: newId("U-"), name, email, mobile: "", passHash: hash, salt, isAdmin: false, createdAt: new Date().toISOString() };
  const token = newToken();
  const expiresAt = sessionExpiry();

  await updateDb((db) => {
    db.users.push(user);
    db.sessions.push({ token, userId: user.id, createdAt: new Date().toISOString(), expiresAt });
  });

  const res = NextResponse.json({ user: publicUser(user) }, { status: 201 });
  res.headers.set("Set-Cookie", sessionCookie(token, expiresAt));
  return res;
}
