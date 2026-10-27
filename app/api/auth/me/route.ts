import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import { getSessionUser, publicUser } from "@/lib/server/auth";
import {
  cleanText,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

// GET /api/auth/me — logged-in user ya 401
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: publicUser(user) });
}

// PATCH /api/auth/me { name } — profile name update
export async function PATCH(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const name = cleanText(body.name, 80);
  if (name.length < 3) {
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });
  }

  const updated = await updateDb((db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (!u) return null;
    u.name = name;
    db.reviews.forEach((r) => {
      if (r.userId === user.id) r.userName = name;
    });
    return publicUser(u);
  });
  if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ user: updated });
}
