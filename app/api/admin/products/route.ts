import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import type { Product } from "@/lib/products";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";

function validateProduct(body: Record<string, unknown>, isNew: boolean) {
  const slug = String(body.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const name = String(body.name ?? "").trim();
  const category = String(body.category ?? "").trim();
  const group = String(body.group ?? "dry-fruits").trim();
  const image = String(body.image ?? "/images/mixed.jpg").trim();
  const rating = Math.min(5, Math.max(0, Number(body.rating ?? 4.5)));
  const reviews = Math.max(0, Math.floor(Number(body.reviews ?? 0)));
  const badge = body.badge === "Best Seller" || body.badge === "New Arrival" ? body.badge : undefined;
  const inStock = body.inStock !== false;
  const description = String(body.description ?? "").trim();
  const highlights = Array.isArray(body.highlights)
    ? body.highlights.filter((h): h is string => typeof h === "string").map((h) => h.trim()).filter(Boolean).slice(0, 8)
    : [];
  const variants = Array.isArray(body.variants)
    ? body.variants
        .map((v) => ({
          label: String((v as { label?: unknown }).label ?? "").trim(),
          price: Math.max(1, Math.floor(Number((v as { price?: unknown }).price ?? 0))),
          mrp: Math.max(1, Math.floor(Number((v as { mrp?: unknown }).mrp ?? 0))),
        }))
        .filter((v) => v.label && v.price > 0)
        .slice(0, 6)
    : [];

  if (isNew && !slug) return { error: "slug is required (e.g. premium-almonds)." };
  if (!name) return { error: "Product name is required." };
  if (!category) return { error: "Category is required." };
  // Category DB me exist karni chahiye — check updateDb ke andar hota hai.
  if (!["dry-fruits", "nuts-seeds", "dates-figs", "gift-hampers"].includes(group))
    return { error: "Invalid group." };
  if (!description) return { error: "Description is required." };
  if (variants.length === 0) return { error: "At least one variant (label, price, mrp) is required." };
  const metaTitle = String(body.metaTitle ?? "").trim().slice(0, 120) || undefined;
  const metaDescription = String(body.metaDescription ?? "").trim().slice(0, 320) || undefined;
  return {
    data: { slug, name, category, group, image, rating, reviews, badge, inStock, description, highlights, variants, metaTitle, metaDescription } as Product & { added: number },
  };
}

// GET /api/admin/products — saare products (admin only)
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const db = await readDb();
  return NextResponse.json({ products: db.products, count: db.products.length });
}

// POST /api/admin/products — naya product banao
export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const body = await req.json().catch(() => ({}));
  const v = validateProduct(body, true);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const product = await updateDb((db) => {
    if (db.products.some((p) => p.slug === v.data.slug)) throw new Error("A product with this slug already exists.");
    if (!db.categories.some((c) => c.slug === v.data.category)) throw new Error("Selected category does not exist.");
    const p: Product = { ...v.data, added: Date.now() };
    db.products.unshift(p);
    return p;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as Product);
  if ("__error" in product) return NextResponse.json({ error: product.__error }, { status: 409 });
  return NextResponse.json({ product }, { status: 201 });
}

// PUT /api/admin/products { slug, ...fields } — product update karo
export async function PUT(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim();
  if (!slug) return NextResponse.json({ error: "slug required." }, { status: 400 });
  const v = validateProduct({ ...body, slug }, false);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const product = await updateDb((db) => {
    const i = db.products.findIndex((p) => p.slug === slug);
    if (i < 0) return null;
    if (!db.categories.some((c) => c.slug === v.data.category)) throw new Error("Selected category does not exist.");
    const updated: Product = { ...v.data, slug, added: db.products[i].added };
    db.products[i] = updated;
    return updated;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (product && "__error" in product) return NextResponse.json({ error: product.__error }, { status: 400 });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({ product });
}

// DELETE /api/admin/products?slug= — product hatao
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  if (!slug) return NextResponse.json({ error: "slug required." }, { status: 400 });
  const removed = await updateDb((db) => {
    const i = db.products.findIndex((p) => p.slug === slug);
    if (i < 0) return false;
    db.products.splice(i, 1);
    return true;
  });
  if (!removed) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
