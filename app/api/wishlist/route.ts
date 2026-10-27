import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import {
  cleanText,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

// GET /api/wishlist — user ki wishlist
// POST /api/wishlist { slug } — toggle
// PUT /api/wishlist { items } — full sync
// DELETE /api/wishlist?slug= — remove one / clear all
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ items: [], guest: true });
  const db = await readDb();
  return NextResponse.json({ items: db.wishlists[user.id] ?? [] });
}

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const slug = cleanText(body.slug, 80);
  if (!slug) return NextResponse.json({ error: "slug required." }, { status: 400 });

  const items = await updateDb((db) => {
    const cur = db.wishlists[user.id] ?? [];
    const next = cur.includes(slug) ? cur.filter((s) => s !== slug) : [...cur, slug];
    db.wishlists[user.id] = next;
    return next;
  });
  return NextResponse.json({ items });
}

export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const parsed = await readJsonSafe(req, 20_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const items = Array.isArray(body.items)
    ? body.items.map((s) => cleanText(s, 80)).filter(Boolean).slice(0, 200)
    : [];

  await updateDb((db) => {
    db.wishlists[user.id] = items;
  });
  return NextResponse.json({ items });
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const slug = cleanText(new URL(req.url).searchParams.get("slug") ?? "", 80);
  const items = await updateDb((db) => {
    if (!slug) {
      db.wishlists[user.id] = [];
      return [] as string[];
    }
    const next = (db.wishlists[user.id] ?? []).filter((s) => s !== slug);
    db.wishlists[user.id] = next;
    return next;
  });
  return NextResponse.json({ items });
}
