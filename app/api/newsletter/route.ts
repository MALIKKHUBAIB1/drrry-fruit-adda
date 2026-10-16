import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";

// POST /api/newsletter { email } — subscribe (public)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const db = await readDb();
  if (db.newsletter.some((s) => s.email === email)) {
    return NextResponse.json({ ok: true, message: "You're already subscribed!" });
  }
  await updateDb((d) => {
    d.newsletter.unshift({ email, createdAt: new Date().toISOString() });
  });
  return NextResponse.json({ ok: true, message: "Thanks for subscribing!" }, { status: 201 });
}

// GET /api/newsletter — subscribers list (admin only)
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user?.isAdmin) return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  const db = await readDb();
  return NextResponse.json({ subscribers: db.newsletter, count: db.newsletter.length });
}

// DELETE /api/newsletter?email= — unsubscribe (public, apna email)
export async function DELETE(req: NextRequest) {
  const email = new URL(req.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "email required." }, { status: 400 });
  await updateDb((db) => {
    db.newsletter = db.newsletter.filter((s) => s.email !== email);
  });
  return NextResponse.json({ ok: true });
}
