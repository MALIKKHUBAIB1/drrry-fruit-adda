import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import type { Product as ProductType } from "@/lib/products";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, sameOrigin, toFloat, toInt } from "@/lib/server/security";
import { announceNewProduct } from "@/lib/server/notify";

const VALID_GROUPS = ["dry-fruits", "nuts-seeds", "dates-figs", "gift-hampers"];

function validateProduct(body: Record<string, unknown>, isNew: boolean) {
  const slug = safeSlugLocal(body.slug);
  const name = cleanText(body.name, 120);
  const category = cleanText(body.category, 40);
  const group = cleanText(body.group, 20);
  const image = cleanText(body.image, 500) || "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/mixed_Cb6n5_mP1.jpg";
  const images = Array.isArray(body.images)
    ? body.images.map((i) => cleanText(i, 500)).filter(Boolean).slice(0, 8)
    : [];
  const rating = toFloat(body.rating, 0, 5);
  const reviews = toInt(body.reviews, 0, 100000);
  const badge = body.badge === "Best Seller" || body.badge === "New Arrival" ? body.badge : undefined;
  const inStock = body.inStock !== false;
  const description = cleanText(body.description, 2000);
  const highlights = Array.isArray(body.highlights)
    ? body.highlights.map((h) => cleanText(h, 120)).filter(Boolean).slice(0, 8)
    : [];
  // Amazon-style specs table — [{ label, value }]
  const specs = Array.isArray(body.specs)
    ? body.specs
        .map((row) => {
          const o = row as Record<string, unknown>;
          const label = cleanText(o?.label ?? "", 60);
          const value = cleanText(o?.value ?? "", 160);
          return label && value ? { label, value } : null;
        })
        .filter((x): x is { label: string; value: string } => x !== null)
        .slice(0, 20)
    : undefined;

  // FAQ — [{ q, a }]
  const faq = Array.isArray(body.faq)
    ? body.faq
        .map((row) => {
          const o = row as Record<string, unknown>;
          const q = cleanText(o?.q ?? "", 160);
          const a = cleanText(o?.a ?? "", 600);
          return q && a ? { q, a } : null;
        })
        .filter((x): x is { q: string; a: string } => x !== null)
        .slice(0, 15)
    : undefined;

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
  const deliveryOptions = Array.isArray(body.deliveryOptions)
    ? body.deliveryOptions
        .map((o: unknown) => {
          const x = (o ?? {}) as Record<string, unknown>;
          const label = cleanText(x.label, 40);
          if (!label) return null;
          return {
            id: safeSlugLocal(x.id) || safeSlugLocal(label) || `opt-${label.length}${label.charCodeAt(0)}`,
            label,
            days: toInt(x.days, 0, 60),
            surcharge: toInt(x.surcharge, 0, 100000),
            enabled: x.enabled !== false,
          };
        })
        .filter((o): o is NonNullable<typeof o> => !!o)
        .slice(0, 5)
    : [];

  if (isNew && !slug) return { error: "slug is required (e.g. premium-almonds)." };
  if (name.length < 3) return { error: "Product name is required." };
  if (!category) return { error: "Category is required." };
  if (!VALID_GROUPS.includes(group)) return { error: "Invalid collection." };
  if (description.length < 10) return { error: "Description must be at least 10 characters." };
  if (variants.length === 0) return { error: "At least one pack size with price and MRP is required." };
  return {
    data: { slug, name, category, group, image, images, rating, reviews, badge, inStock, description, highlights, ...(specs ? { specs } : {}), ...(faq ? { faq } : {}), variants, deliveryOptions, metaTitle, metaDescription },
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
  if (!product) return NextResponse.json({ error: "Failed to save product." }, { status: 500 });

  // Newsletter alert — best effort. Email fail ho toh PRODUCT FAIL NAHI
  // hota; alert ka result response me chala jata hai (admin UI/test ke liye).
  let announce: Awaited<ReturnType<typeof announceNewProduct>> = {};
  try {
    announce = await announceNewProduct(product);
  } catch (e) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "new-product announce failed",
        slug: product.slug,
        error: e instanceof Error ? e.message : String(e),
      }),
    );
  }
  return NextResponse.json({ product, announce }, { status: 201 });
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

  const product = await updateDb((db) => {
    const i = db.products.findIndex((p) => p.slug === slug);
    if (i < 0) return null;
    // Body ke saath merge karo taaki partial update (e.g. sirf status toggle)
    // baaki fields — jaise badge — wipe na kar de.
    const merged = { ...db.products[i], ...body, slug };
    const v2 = validateProduct(merged, false);
    if ("error" in v2) throw new Error(v2.error);
    if (!db.categories.some((c) => c.slug === v2.data.category)) throw new Error("Selected category does not exist.");
    const updated: ProductType = { ...v2.data, slug, added: db.products[i].added } as ProductType;
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
