import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import {
  newToken,
  publicUser,
  sessionCookie,
  sessionExpiry,
  verifyPassword,
} from "@/lib/server/auth";

// POST /api/auth/login { email, password }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

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
