import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";

// GET /api/admin/reviews?slug= — saare reviews moderate karne ke liye
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const slug = new URL(req.url).searchParams.get("slug")?.trim();
  const db = await readDb();
  const reviews = db.reviews
    .filter((r) => !slug || r.productSlug === slug)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return NextResponse.json({ reviews, count: reviews.length });
}

// DELETE /api/admin/reviews?id= — koi bhi review hatao
export async function DELETE(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const id = new URL(req.url).searchParams.get("id")?.trim();
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });
  const removed = await updateDb((db) => {
    const i = db.reviews.findIndex((r) => r.id === id);
    if (i < 0) return false;
    db.reviews.splice(i, 1);
    return true;
  });
  if (!removed) return NextResponse.json({ error: "Review not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
