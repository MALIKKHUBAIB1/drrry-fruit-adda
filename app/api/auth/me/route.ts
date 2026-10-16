import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import { getSessionUser, publicUser } from "@/lib/server/auth";

// GET /api/auth/me — logged-in user ya 401
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user: publicUser(user) });
}

// PATCH /api/auth/me { name } — profile name update
export async function PATCH(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  if (name.length < 3)
    return NextResponse.json({ error: "Please enter your full name." }, { status: 400 });

  const updated = await updateDb((db) => {
    const u = db.users.find((x) => x.id === user.id);
    if (!u) return null;
    u.name = name;
    // Reviews me dikhne wala naam bhi update kar do
    db.reviews.forEach((r) => {
      if (r.userId === user.id) r.userName = name;
    });
    return publicUser(u);
  });
  if (!updated) return NextResponse.json({ error: "User not found." }, { status: 404 });
  return NextResponse.json({ user: updated });
}
