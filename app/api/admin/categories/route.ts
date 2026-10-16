import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// GET /api/admin/categories — saari categories + product count
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const db = await readDb();
  const categories = db.categories.map((c) => ({
    ...c,
    products: db.products.filter((p) => p.category === c.slug).length,
  }));
  return NextResponse.json({ categories });
}

// POST /api/admin/categories { name, slug?, image? }
export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const slug = slugify(String(body.slug ?? "") || name);
  const image = String(body.image ?? "").trim() || "/images/mixed.jpg";
  if (name.length < 2) return NextResponse.json({ error: "Category name required." }, { status: 400 });
  if (!slug) return NextResponse.json({ error: "Valid slug required." }, { status: 400 });

  const category = await updateDb((db) => {
    if (db.categories.some((c) => c.slug === slug)) throw new Error("A category with this slug already exists.");
    const c = { slug, name, image };
    db.categories.push(c);
    return c;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (category && "__error" in category) return NextResponse.json({ error: category.__error }, { status: 409 });
  return NextResponse.json({ category }, { status: 201 });
}

// PUT /api/admin/categories { slug, name?, image? } — slug change nahi hota
export async function PUT(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "slug required." }, { status: 400 });

  const updated = await updateDb((db) => {
    const c = db.categories.find((x) => x.slug === slug);
    if (!c) return null;
    if (typeof body.name === "string" && body.name.trim().length >= 2) c.name = body.name.trim();
    if (typeof body.image === "string" && body.image.trim()) c.image = body.image.trim();
    return c;
  });
  if (!updated) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  return NextResponse.json({ category: updated });
}

// DELETE /api/admin/categories?slug= — sirf tab jab koi product use na karta ho
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "slug required." }, { status: 400 });

  const done: boolean | { __error: string } = await updateDb((db) => {
    const used = db.products.filter((p) => p.category === slug).length;
    if (used > 0) throw new Error(`${used} product(s) use this category. Move or delete them first.`);
    const i = db.categories.findIndex((c) => c.slug === slug);
    if (i < 0) return false;
    db.categories.splice(i, 1);
    return true;
  }).catch((e: Error) => ({ __error: e.message }));
  if (typeof done === "object" && "__error" in done)
    return NextResponse.json({ error: done.__error }, { status: 400 });
  if (!done) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
