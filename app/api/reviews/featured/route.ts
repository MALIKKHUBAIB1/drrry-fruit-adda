import { NextResponse } from "next/server";
import { readDb } from "@/lib/server/db";

// GET /api/reviews/featured?limit=3 — home page testimonials ke liye best reviews
export async function GET(req: Request) {
  const limit = Math.min(12, Math.max(1, Number(new URL(req.url).searchParams.get("limit") ?? 3)));
  const db = await readDb();
  const featured = db.reviews
    .filter((r) => r.rating >= 4)
    .sort((a, b) => b.rating - a.rating || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit)
    .map((r) => {
      const p = db.products.find((x) => x.slug === r.productSlug);
      return { ...r, productName: p?.name ?? r.productSlug };
    });
  return NextResponse.json({ reviews: featured });
}
