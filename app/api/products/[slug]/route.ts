import { NextResponse } from "next/server";
import { getProductBySlug, getProducts } from "@/lib/server/db";
import { cleanText } from "@/lib/server/security";

// GET /api/products/:slug
// Public GET responses browser/CDN cache kar sake — isse repeat visits par
// network hit hi nahi hota (stale-while-revalidate ke saath).
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
};


export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const safeSlug = cleanText(slug, 80);
  const product = await getProductBySlug(safeSlug);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const all = await getProducts();
  const related = all
    .filter((p) => p.slug !== safeSlug && (p.category === product.category || p.group === product.group))
    .slice(0, 4);
  return NextResponse.json({ product, related }, { headers: CACHE_HEADERS });
}
