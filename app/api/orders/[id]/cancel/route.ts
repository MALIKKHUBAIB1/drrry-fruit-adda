import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import { cleanText, sameOrigin } from "@/lib/server/security";
import { publish } from "@/lib/server/events";
import { issueOrderRefund, type RefundOutcome } from "@/lib/server/refunds";

// Delivery shuru hone se pehle cancel allowed hai. "out-for-delivery" ke baad
// order courier ke paas hota hai — tab customer cancel nahi kar sakta.
const CANCELABLE = new Set(["placed", "packed", "shipped"]);

/**
 * POST /api/orders/:id/cancel — apna order cancel karo (delivery se pehle).
 *
 * ✅ placed / packed / shipped me cancel allowed; out-for-delivery ke baad nahi.
 * ✅ Online paid order cancel hone pe Razorpay refund AUTOMATICALLY try hota hai
 *    — COD pe koi refund nahi (paisa vaise bhi collect nahi hua).
 * ✅ statusHistory me note ke saath audit trail.
 * ✅ Refund fail hone par BHI order cancel rehta hai (customer intent zaroori
 *    hai) — response me refund.status="failed" aata hai taaki UI support ka
 *    message dikha sake; admin baad me retry kar sakta hai.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const { id } = await params;
  const safeId = cleanText(id, 40);

  // 1) Cancel — status check ke saath (single atomic update)
  const order = await updateDb((db) => {
    const o = db.orders.find((x) => x.id === safeId && x.userId === user.id);
    if (!o) return null;
    if (o.status === "cancelled") throw new Error("Order is already cancelled.");
    if (o.status === "delivered") throw new Error("Delivered orders cannot be cancelled. Raise a return instead.");
    if (!CANCELABLE.has(o.status)) throw new Error("Order is out for delivery and can no longer be cancelled.");
    o.status = "cancelled";
    o.statusHistory = [
      ...(o.statusHistory ?? []),
      { status: "cancelled", at: new Date().toISOString(), note: `Cancelled by customer` },
    ];
    return JSON.parse(JSON.stringify(o));
  }).catch((e: Error) => ({ __error: e.message }) as unknown as null);

  if (order && "__error" in order) {
    return NextResponse.json({ error: order.__error }, { status: 400 });
  }
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  publish({ orderId: safeId, status: "cancelled" });

  // 2) Refund (COD/unpaid → not_needed; failed → order cancel hi rehta hai)
  const refund: RefundOutcome = await issueOrderRefund({
    id: safeId,
    payment: (order as { payment?: "cod" | "online" }).payment,
    paymentId: (order as { paymentId?: string }).paymentId,
    paymentStatus: (order as { paymentStatus?: string }).paymentStatus,
  });

  // DB se taaza order padho (refund ne paymentStatus update kiya hoga)
  const db = await readDb();
  const fresh = db.orders.find((o) => o.id === safeId) ?? order;

  return NextResponse.json({ order: fresh, refund });
}
