import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb, type CartItem } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";

// GET /api/cart — login wale user ka saved cart
// PUT /api/cart { items } — cart save/merge
// DELETE /api/cart — cart clear
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ items: [], guest: true });
  const db = await readDb();
  return NextResponse.json({ items: db.carts[user.id] ?? [] });
}

export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const items = Array.isArray(body.items) ? (body.items as CartItem[]) : [];
  // Basic sanitize: sirf valid shape rakho
  const clean = items
    .filter((x) => x && typeof x.slug === "string" && typeof x.variant === "string")
    .map((x) => ({ slug: x.slug, variant: x.variant, qty: Math.max(1, Math.min(20, Number(x.qty) || 1)) }));
  await updateDb((db) => {
    db.carts[user.id] = clean;
  });
  return NextResponse.json({ items: clean });
}

export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  await updateDb((db) => {
    db.carts[user.id] = [];
  });
  return NextResponse.json({ items: [] });
}
