import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import { cleanText, readJsonSafe, sameOrigin } from "@/lib/server/security";

// POST /api/orders/:id/cancel — apna "placed" order cancel karo
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await params;
  const safeId = cleanText(id, 40);

  const order = await updateDb((db) => {
    const o = db.orders.find((x) => x.id === safeId && x.userId === user.id);
    if (!o) return null;
    if (o.status !== "placed")
      throw new Error(`Order is already ${o.status}, it cannot be cancelled.`);
    o.status = "cancelled";
    return o;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);

  if (order && "__error" in order) {
    return NextResponse.json({ error: order.__error }, { status: 400 });
  }
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order });
}
