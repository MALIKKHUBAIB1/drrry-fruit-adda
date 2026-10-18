import { NextResponse } from "next/server";
import { getCategories } from "@/lib/server/db";
import { groups } from "@/lib/products";

// GET /api/categories — dynamic category list (DB se)
// Public GET responses browser/CDN cache kar sake — isse repeat visits par
// network hit hi nahi hota (stale-while-revalidate ke saath).
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
};


export async function GET() {
  return NextResponse.json({ categories: await getCategories(), groups }, { headers: CACHE_HEADERS });
}
