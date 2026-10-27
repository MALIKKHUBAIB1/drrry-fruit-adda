import type { NextRequest } from "next/server";
import { readDb, type DbUser } from "./db";

export const SESSION_COOKIE = "dfa_session";
const SESSION_DAYS = 30;

// Crypto helpers yahin se re-export taaki purane imports na tootein.
export { hashPassword, newId, newToken, verifyPassword } from "./crypto";

export function sessionExpiry() {
  return new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

/** Request actually HTTPS par aayi ya nahi (Vercel par x-forwarded-proto, warna URL). */
export function requestIsHttps(req: Request) {
  const fwd = req.headers.get("x-forwarded-proto");
  if (fwd) return fwd.split(",")[0].trim() === "https";
  try {
    return new URL(req.url).protocol === "https:";
  } catch {
    return false;
  }
}

export function sessionCookie(token: string, expiresAt: string, req?: Request) {
  const expires = new Date(expiresAt);
  // Secure: sirf real HTTPS par. http://localhost (next start) par Secure cookie
  // browser reject kar deta hai — tab login dikhta hai par session lagta hi nahi.
  const https = req ? requestIsHttps(req) : process.env.NODE_ENV === "production";
  const secure = https ? "; Secure" : "";
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax${secure}; Expires=${expires.toUTCString()}`;
}

export function clearSessionCookie(req?: Request) {
  const https = req ? requestIsHttps(req) : process.env.NODE_ENV === "production";
  const secure = https ? "; Secure" : "";
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=0`;
}

export function getTokenFromRequest(req: NextRequest): string | null {
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}

/** Cookie token se user nikalo (null = guest). Expired sessions ignore hote hain. */
export async function getSessionUser(req: NextRequest): Promise<DbUser | null> {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  const db = await readDb();
  const sess = db.sessions.find((s) => s.token === token);
  if (!sess) return null;
  if (new Date(sess.expiresAt).getTime() < Date.now()) return null;
  return db.users.find((u) => u.id === sess.userId) ?? null;
}

export function publicUser(u: DbUser) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    mobile: u.mobile ?? "",
    isAdmin: !!u.isAdmin,
    createdAt: u.createdAt,
  };
}
