import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import { clearSessionCookie, getTokenFromRequest } from "@/lib/server/auth";

// POST /api/auth/logout
export async function POST(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (token) {
    await updateDb((db) => {
      db.sessions = db.sessions.filter((s) => s.token !== token);
    });
  }
  const res = NextResponse.json({ ok: true });
  res.headers.set("Set-Cookie", clearSessionCookie());
  return res;
}
