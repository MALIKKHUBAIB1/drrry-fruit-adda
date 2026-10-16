import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";

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
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim();
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
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? body.items.filter((s: unknown) => typeof s === "string") : [];
  await updateDb((db) => {
    db.wishlists[user.id] = items;
  });
  return NextResponse.json({ items });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const slug = new URL(req.url).searchParams.get("slug");
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
