import { NextResponse } from "next/server";
import { readDb } from "@/lib/server/db";
import { cleanText } from "@/lib/server/security";

// GET /api/hampers?slug= — list ya single hamper
export async function GET(req: Request) {
  const url = new URL(req.url);
  const slug = cleanText(url.searchParams.get("slug") ?? "", 80);

  const db = await readDb();
  if (slug) {
    const hamper = db.hampers.find((h) => h.slug === slug);
    if (!hamper) return NextResponse.json({ error: "Hamper not found." }, { status: 404 });
    const related = db.hampers.filter((h) => h.slug !== slug).slice(0, 4);
    return NextResponse.json({ hamper, related });
  }
  const list = db.hampers;
  return NextResponse.json({ hampers: list, count: list.length });
}
