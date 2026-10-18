import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import { cleanText } from "@/lib/server/security";

// GET /api/reviews/featured?limit=3 — home page testimonials ke liye best reviews
// Public GET responses browser/CDN cache kar sake — isse repeat visits par
// network hit hi nahi hota (stale-while-revalidate ke saath).
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
};


export async function GET(req: Request) {
  const limit = Math.min(12, Math.max(1, Math.floor(Number(new URL(req.url).searchParams.get("limit") ?? 3))));
  const db = await readDb();
  const featured = db.reviews
    .filter((r) => r.rating >= 4)
    .sort((a, b) => b.rating - a.rating || +new Date(b.createdAt) - +new Date(a.createdAt))
    .slice(0, limit)
    .map((r) => {
      const p = db.products.find((x) => x.slug === r.productSlug);
      return { ...r, productName: p?.name ?? r.productSlug };
    });
  return NextResponse.json({ reviews: featured }, { headers: CACHE_HEADERS });
}
