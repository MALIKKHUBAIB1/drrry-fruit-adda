import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import {
  cleanText,
  isValidEmail,
  rateLimit,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

// POST /api/newsletter { email } — subscribe (public)
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`newsletter:${ip}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  if (!isValidEmail(email)) {
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
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const email = cleanText(new URL(req.url).searchParams.get("email") ?? "", 254).toLowerCase();
  if (!isValidEmail(email)) return NextResponse.json({ error: "email required." }, { status: 400 });
  await updateDb((db) => {
    db.newsletter = db.newsletter.filter((s) => s.email !== email);
  });
  return NextResponse.json({ ok: true });
}
