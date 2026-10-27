import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import {
  cleanText,
  readJsonSafe,
  sameOrigin,
  toFloat,
  toInt,
} from "@/lib/server/security";

const VALID_BADGES = ["Best Seller", "New Arrival"];

function validateHamper(body: Record<string, unknown>, isNew: boolean) {
  const slug = body.slug
    ? String(body.slug).toLowerCase().trim().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80)
    : "";
  const name = cleanText(body.name, 120);
  const images = Array.isArray(body.images)
    ? body.images
        .map((u) => cleanText(String(u ?? ""), 500))
        .filter((u) => /^https?:\/\//.test(u))
        .slice(0, 8)
    : [];
  const image = images[0] || cleanText(body.image, 500) || "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/gift_JYpveUrx4.jpg";
  if (!images.length) images.push(image);
  const description = cleanText(body.description, 2000);
  const highlights = Array.isArray(body.highlights)
    ? body.highlights.map((h) => cleanText(h, 120)).filter(Boolean).slice(0, 8)
    : [];
  const price = toInt(body.price, 1, 10000000);
  const mrp = toInt(body.mrp, 1, 10000000);
  const rating = toFloat(body.rating, 0, 5);
  const reviews = toInt(body.reviews, 0, 100000);
  const badge = VALID_BADGES.includes(String(body.badge)) ? (body.badge as "Best Seller" | "New Arrival") : undefined;
  const inStock = body.inStock !== false;
  const items = Array.isArray(body.items)
    ? body.items
        .map((it) => {
          const o = it as Record<string, unknown>;
          return {
            slug: cleanText(o.slug, 80),
            name: cleanText(o.name, 120),
            qty: toInt(o.qty, 1, 50),
          };
        })
        .filter((it) => it.slug && it.name)
        .slice(0, 20)
    : [];
  const metaTitle = cleanText(body.metaTitle, 120) || undefined;
  const metaDescription = cleanText(body.metaDescription, 320) || undefined;

  if (isNew && !slug) return { error: "slug is required (e.g. festive-gift-box)." };
  if (name.length < 3) return { error: "Hamper name is required." };
  if (description.length < 10) return { error: "Description must be at least 10 characters." };
  if (price < 1 || mrp < price) return { error: "MRP must be >= price." };
  return {
    data: { slug, name, image, images, description, highlights, price, mrp, rating, reviews, badge, inStock, items, metaTitle, metaDescription },
  };
}

// GET /api/admin/hampers
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const db = await readDb();
  return NextResponse.json({ hampers: db.hampers, count: db.hampers.length });
}

// POST /api/admin/hampers
export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 50_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const v = validateHamper(body, true);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const hamper = await updateDb((db) => {
    if (db.hampers.some((h) => h.slug === v.data.slug)) throw new Error("A hamper with this slug already exists.");
    const now = new Date().toISOString();
    const h = { id: `H-${v.data.slug.toUpperCase()}`, ...v.data, createdAt: now, updatedAt: now };
    db.hampers.unshift(h);
    return h;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (hamper && "__error" in hamper) return NextResponse.json({ error: hamper.__error }, { status: 409 });
  return NextResponse.json({ hamper }, { status: 201 });
}

// PUT /api/admin/hampers { slug, ... }
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

  const v = validateHamper({ ...body, slug }, false);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const hamper = await updateDb((db) => {
    const i = db.hampers.findIndex((h) => h.slug === slug);
    if (i < 0) return null;
    const updated = { ...v.data, slug, id: db.hampers[i].id, createdAt: db.hampers[i].createdAt, updatedAt: new Date().toISOString() };
    db.hampers[i] = updated;
    return updated;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);
  if (hamper && "__error" in hamper) return NextResponse.json({ error: hamper.__error }, { status: 400 });
  if (!hamper) return NextResponse.json({ error: "Hamper not found." }, { status: 404 });
  return NextResponse.json({ hamper });
}

// DELETE /api/admin/hampers?slug=
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const slug = cleanText(new URL(req.url).searchParams.get("slug") ?? "", 80);
  if (!slug) return NextResponse.json({ error: "slug required." }, { status: 400 });
  const removed = await updateDb((db) => {
    const i = db.hampers.findIndex((h) => h.slug === slug);
    if (i < 0) return false;
    db.hampers.splice(i, 1);
    return true;
  });
  if (!removed) return NextResponse.json({ error: "Hamper not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
