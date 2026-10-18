import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser, newId } from "@/lib/server/auth";
import {
  cleanText,
  isValidEmail,
  readJsonSafe,
  sameOrigin,
  toInt,
} from "@/lib/server/security";

// GET /api/reviews?slug=premium-almonds — list + summary
export async function GET(req: NextRequest) {
  const slug = cleanText(new URL(req.url).searchParams.get("slug") ?? "", 80);
  if (!slug) return NextResponse.json({ error: "slug required." }, { status: 400 });

  const db = await readDb();
  if (!db.products.some((p) => p.slug === slug)) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const reviews = db.reviews
    .filter((r) => r.productSlug === slug)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  const count = reviews.length;
  const avg = count === 0 ? 0 : Math.round((reviews.reduce((s, r) => s + r.rating, 0) / count) * 10) / 10;
  const dist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }));

  const me = await getSessionUser(req);
  const myReview = me ? (reviews.find((r) => r.userId === me.id) ?? null) : null;

  // userId internal identifier hai — public payload me expose na ho.
  const pub = reviews.map(({ userId: _omit, ...r }) => r);
  return NextResponse.json({ reviews: pub, count, avg, dist, myReview: myReview ? { ...myReview, userId: myReview.userId } : null });
}

// POST /api/reviews { slug, rating, title?, comment } — login required, ek user ka ek review (dobara bhejne par update)
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required to write a review." }, { status: 401 });

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const slug = cleanText(body.slug, 80);
  const rating = toInt(body.rating, 1, 5);
  const title = cleanText(body.title, 80);
  const comment = cleanText(body.comment, 1000);

  if (!slug) return NextResponse.json({ error: "Product required." }, { status: 400 });
  if (rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Please select 1 to 5 stars." }, { status: 400 });
  }
  if (comment.length < 3) {
    return NextResponse.json({ error: "Please write a few words about the product." }, { status: 400 });
  }

  const saved = await updateDb((db) => {
    if (!db.products.some((p) => p.slug === slug)) throw new Error("Product not found.");
    const existing = db.reviews.find((r) => r.productSlug === slug && r.userId === user.id);
    if (existing) {
      existing.rating = rating;
      existing.title = title;
      existing.comment = comment;
      existing.createdAt = new Date().toISOString();
      return { review: existing, updated: true as boolean };
    }
    const review = {
      id: newId("R-"),
      productSlug: slug,
      userId: user.id,
      userName: cleanText(user.name, 80),
      rating,
      title,
      comment,
      createdAt: new Date().toISOString(),
    };
    db.reviews.unshift(review);
    return { review, updated: false as boolean };
  }).catch((e: Error) => ({ __error: e.message }) as unknown as { review: null; updated: false });

  if ("__error" in saved) {
    return NextResponse.json({ error: saved.__error }, { status: 400 });
  }
  return NextResponse.json(
    { review: saved.review, updated: saved.updated },
    { status: saved.updated ? 200 : 201 },
  );
}

// DELETE /api/reviews?id= — apna review delete karo (login required)
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const id = cleanText(new URL(req.url).searchParams.get("id") ?? "", 40);
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const removed = await updateDb((db) => {
    const i = db.reviews.findIndex((r) => r.id === id && r.userId === user.id);
    if (i < 0) return false;
    db.reviews.splice(i, 1);
    return true;
  });
  if (!removed) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
