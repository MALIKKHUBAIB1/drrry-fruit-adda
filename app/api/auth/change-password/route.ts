import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import { getSessionUser, hashPassword, verifyPassword } from "@/lib/server/auth";

// POST /api/auth/change-password { current, password }
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const current = String(body.current ?? "");
  const password = String(body.password ?? "");
  if (password.length < 6)
    return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });

  const ok = await updateDb((db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (!u) return false;
    if (!verifyPassword(current, u.salt, u.passHash)) return "wrong";
    const { salt, hash } = hashPassword(password);
    u.salt = salt;
    u.passHash = hash;
    // Saare sessions expire kar do (dobara login karna padega)
    db.sessions = db.sessions.filter((s) => s.userId !== user.id);
    return true;
  });
  if (ok === "wrong")
    return NextResponse.json({ error: "Current password is wrong." }, { status: 400 });
  if (!ok) return NextResponse.json({ error: "User not found." }, { status: 404 });
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", "dfa_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
  return res;
}
