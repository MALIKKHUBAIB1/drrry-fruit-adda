import { NextResponse } from "next/server";
import { groups } from "@/lib/products";
import { getCategories } from "@/lib/server/db";

// GET /api/categories — dynamic category list (DB se)
export async function GET() {
  return NextResponse.json({ categories: await getCategories(), groups });
}
