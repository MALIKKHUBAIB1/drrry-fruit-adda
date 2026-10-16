import { NextResponse } from "next/server";
import { getProductBySlug, getProducts } from "@/lib/server/db";

// GET /api/products/:slug
export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) {
    return NextResponse.json({ error: "Product not found." }, { status: 404 });
  }
  const all = await getProducts();
  const related = all
    .filter((p) => p.slug !== slug && (p.category === product.category || p.group === product.group))
    .slice(0, 4);
  return NextResponse.json({ product, related });
}
