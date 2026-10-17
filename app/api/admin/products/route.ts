import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import type { Product as ProductType } from "@/lib/products";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, sameOrigin, toFloat, toInt } from "@/lib/server/security";

const VALID_GROUPS = ["dry-fruits", "nuts-seeds", "dates-figs", "gift-hampers"];

function validateProduct(body: Record<string, unknown>, isNew: boolean) {
  const slug = safeSlugLocal(body.slug);
  const name = cleanText(body.name, 120);
  const category = cleanText(body.category, 40);
  const group = cleanText(body.group, 20);
  const image = cleanText(body.image, 500) || "/images/mixed.jpg";
  const rating = toFloat(body.rating, 0, 5);
  const reviews = toInt(body.reviews, 0, 100000);
  const badge = body.badge === "Best Seller" || body.badge === "New Arrival" ? body.badge : undefined;
  const inStock = body.inStock !== false;
  const description = cleanText(body.description, 2000);
  const highlights = Array.isArray(body.highlights)
    ? body.highlights.map((h) => cleanText(h, 120)).filter(Boolean).slice(0, 8)
    : [];
  const variants = Array.isArray(body.variants)
    ? body.variants
        .map((v) => {
          const o = v as Record<string, unknown>;
          return {
            label: cleanText(o.label, 40),
            price: toInt(o.price, 1, 1000000),
            mrp: toInt(o.mrp, 1, 1000000),
          };
        })
        .filter((v) => v.label && v.price > 0 && v.mrp > 0)
        .slice(0, 6)
    : [];
  const metaTitle = cleanText(body.metaTitle, 120) || undefined;
  const metaDescription = cleanText(body.metaDescription, 320) || undefined;

  if (isNew && !slug) return { error: "slug is required (e.g. premium-almonds)." };
  if (name.length < 3) return { error: "Product name is required." };
  if (!category) return { error: "Category is required." };
  if (!VALID_GROUPS.includes(group)) return { error: "Invalid collection." };
  if (description.length < 10) return { error: "Description must be at least 10 characters." };
  if (variants.length === 0) return { error: "At least one pack size with price and MRP is required." };
  return {
    data: { slug, name, category, group, image, rating, reviews, badge, inStock, description, highlights, variants, metaTitle, metaDescription },
  };
}

function safeSlugLocal(input: unknown): string {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// GET /api/admin/products
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const db = await readDb();
  return NextResponse.json({ products: db.products, count: db.products.length });
}

// POST /api/admin/products
export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 50_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const v = validateProduct(body, true);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const product = await updateDb((db) => {
    if (db.products.some((p) => p.slug === v.data.slug)) throw new Error("A product with this slug already exists.");
    if (!db.categories.some((c) => c.slug === v.data.category)) throw new Error("Selected category does not exist.");
    const p: ProductType = { ...v.data, added: Date.now() } as ProductType;
    db.products.unshift(p);
    return p;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (product && "__error" in product) return NextResponse.json({ error: product.__error }, { status: 409 });
  return NextResponse.json({ product }, { status: 201 });
}

// PUT /api/admin/products { slug, ...fields }
export async function PUT(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 50_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const slug = cleanText(body.slug, 80);
  if (!slug) return NextResponse.json({ error: "slug required." }, { status: 400 });

  const v = validateProduct({ ...body, slug }, false);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const product = await updateDb((db) => {
    const i = db.products.findIndex((p) => p.slug === slug);
    if (i < 0) return null;
    if (!db.categories.some((c) => c.slug === v.data.category)) throw new Error("Selected category does not exist.");
    const updated: ProductType = { ...v.data, slug, added: db.products[i].added } as ProductType;
    db.products[i] = updated;
    return updated;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (product && "__error" in product) return NextResponse.json({ error: product.__error }, { status: 400 });
  if (!product) return NextResponse.json({ error: "Product not found." }, { status: 404 });
  return NextResponse.json({ product });
}

// DELETE /api/admin/products?slug=
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const slug = cleanText(new URL(req.url).searchParams.get("slug") ?? "", 80);
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
