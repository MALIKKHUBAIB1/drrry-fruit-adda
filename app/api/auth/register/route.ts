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

// POST /api/auth/register { name, email, password }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (name.length < 3)
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (password.length < 6)
    return NextResponse.json(
      { error: "Password must be at least 6 characters." },
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
  const user = { id: newId("U-"), name, email, passHash: hash, salt, isAdmin: false, createdAt: new Date().toISOString() };
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
