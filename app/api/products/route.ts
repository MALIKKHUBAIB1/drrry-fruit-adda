import { NextResponse } from "next/server";
import { getCategories, getProducts } from "@/lib/server/db";
import {
  cleanText,
  toFloat,
  toInt,
} from "@/lib/server/security";

// GET /api/products?q=&category=&group=&sort=&badge=&inStock=&limit=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = cleanText(searchParams.get("q") ?? "", 80).toLowerCase();
  const category = cleanText(searchParams.get("category") ?? "", 40);
  const group = cleanText(searchParams.get("group") ?? "", 40);
  const badge = cleanText(searchParams.get("badge") ?? "", 30);
  const sort = cleanText(searchParams.get("sort") ?? "featured", 20);
  const inStock = searchParams.get("inStock");
  const limit = Math.max(0, Math.min(100, toInt(searchParams.get("limit"), 0, 100)));
  // fill=1: agar filter se kam products mile to baaki catalogue se top-up karo
  // (e.g. homepage "Best Sellers" — best sellers kam ho to baaki dikhao)
  const fill = searchParams.get("fill") === "1";

  let list = await getProducts();

  if (category) list = list.filter((p) => p.category === category);
  if (group) list = list.filter((p) => p.group === group);
  if (badge) list = list.filter((p) => p.badge === badge);
  if (inStock === "true") list = list.filter((p) => p.inStock);
  if (q) {
    list = list.filter((p) =>
      `${p.name} ${p.category} ${p.description}`.toLowerCase().includes(q),
    );
  }

  const priceOf = (p: (typeof list)[number]) => p.variants[0]?.price ?? 0;
  switch (sort) {
    case "price-asc":
      list = [...list].sort((a, b) => priceOf(a) - priceOf(b));
      break;
    case "price-desc":
      list = [...list].sort((a, b) => priceOf(b) - priceOf(a));
      break;
    case "rating":
      list = [...list].sort((a, b) => b.rating - a.rating);
      break;
    case "popular":
      list = [...list].sort((a, b) => b.reviews - a.reviews);
      break;
    case "newest":
      list = [...list].sort((a, b) => b.added - a.added);
      break;
    default:
      break;
  }

  if (fill && limit > 0 && list.length < limit) {
    const slugs = new Set(list.map((p) => p.slug));
    const rest = (await getProducts()).filter((p) => !slugs.has(p.slug));
    list = [...list, ...rest].slice(0, limit);
  }

  if (limit > 0) list = list.slice(0, limit);

  return NextResponse.json({ products: list, categories: await getCategories(), count: list.length });
}
