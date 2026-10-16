import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser, newId } from "@/lib/server/auth";

// GET /api/reviews?slug=premium-almonds — list + summary
export async function GET(req: NextRequest) {
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
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

  return NextResponse.json({ reviews, count, avg, dist, myReview });
}

// POST /api/reviews { slug, rating, title?, comment } — login required, ek user ka ek review (dobara bhejne par update)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required to write a review." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const slug = String(body.slug ?? "").trim();
  const rating = Number(body.rating ?? 0);
  const title = String(body.title ?? "").trim().slice(0, 80);
  const comment = String(body.comment ?? "").trim().slice(0, 1000);

  if (!slug) return NextResponse.json({ error: "Product required." }, { status: 400 });
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Please select 1 to 5 stars." }, { status: 400 });
  }
  if (comment.length < 3) {
    return NextResponse.json({ error: "Please write a few words about the product." }, { status: 400 });
  }

  const saved: { review?: object | null; updated?: boolean; __error?: string } = await updateDb((db) => {
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
      userName: user.name,
      rating,
      title,
      comment,
      createdAt: new Date().toISOString(),
    };
    db.reviews.unshift(review);
    return { review, updated: false as boolean };
  }).catch((e: Error) => ({ __error: e.message }) as unknown as { review: null });

  if (saved.__error) {
    return NextResponse.json({ error: saved.__error }, { status: 400 });
  }
  return NextResponse.json(
    { review: saved.review, updated: saved.updated },
    { status: saved.updated ? 200 : 201 },
  );
}

// DELETE /api/reviews?id= — apna review delete karo (login required)
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id")?.trim();
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
