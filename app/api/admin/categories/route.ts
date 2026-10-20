import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, sameOrigin } from "@/lib/server/security";

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

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

// POST /api/admin/categories { name, slug?, image? }
export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const name = cleanText(body.name, 60);
  const slug = slugify(String(body.slug ?? "") || name);
  const image = cleanText(body.image, 500) || "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/mixed_Cb6n5_mP1.jpg";
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

// PUT /api/admin/categories { slug, name?, image? }
export async function PUT(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const slug = cleanText(body.slug, 80);
  if (!slug) return NextResponse.json({ error: "slug required." }, { status: 400 });

  const updated = await updateDb((db) => {
    const c = db.categories.find((x) => x.slug === slug);
    if (!c) return null;
    if (typeof body.name === "string" && cleanText(body.name, 60).length >= 2) c.name = cleanText(body.name, 60);
    if (typeof body.image === "string" && cleanText(body.image, 500)) c.image = cleanText(body.image, 500);
    return c;
  });
  if (!updated) return NextResponse.json({ error: "Category not found." }, { status: 404 });
  return NextResponse.json({ category: updated });
}

// DELETE /api/admin/categories?slug=
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const slug = cleanText(new URL(req.url).searchParams.get("slug") ?? "", 80);
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
