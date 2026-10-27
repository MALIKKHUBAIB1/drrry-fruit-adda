import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import {
  cleanText,
  readJsonSafe,
  sameOrigin,
  toInt,
} from "@/lib/server/security";

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
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const parsed = await readJsonSafe(req, 20_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const items = Array.isArray(body.items) ? body.items : [];

  const clean = items
    .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
    .map((x) => ({
      slug: cleanText(x.slug, 80),
      variant: cleanText(x.variant, 40),
      qty: toInt(x.qty, 1, 20),
    }))
    .filter((x) => x.slug && x.variant);

  await updateDb((db) => {
    db.carts[user.id] = clean;
  });
  return NextResponse.json({ items: clean });
}

export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  await updateDb((db) => {
    db.carts[user.id] = [];
  });
  return NextResponse.json({ items: [] });
}
