import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import { cleanText } from "@/lib/server/security";

// GET /api/orders/:id — sirf apna order dekh sakte ho
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await params;
  const safeId = cleanText(id, 40);
  const db = await readDb();
  const order = db.orders.find((o) => o.id === safeId && o.userId === user.id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order });
}
