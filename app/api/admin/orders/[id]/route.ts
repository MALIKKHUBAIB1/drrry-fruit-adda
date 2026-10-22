import { NextResponse, type NextRequest } from "next/server";
import { updateDb, type DbOrder } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, safeUrl, sameOrigin } from "@/lib/server/security";
import { ORDER_STATUSES, isOrderStatus, publish } from "@/lib/server/events";
import { sendOrderStatusEmail } from "@/lib/server/ordermail";

// PATCH /api/admin/orders/:id — status / tracking number / note update
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const { id } = await params;
  const safeId = cleanText(id, 40);

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const nextStatus = cleanText(body.status, 24);
  const nextTracking = cleanText(body.trackingNumber, 60);
  const nextTrackingUrl = safeUrl(body.trackingUrl);
  const nextNote = cleanText(body.adminNote, 300);

  if (nextStatus && !isOrderStatus(nextStatus)) {
    return NextResponse.json(
      { error: `Status must be one of: ${ORDER_STATUSES.join(", ")}.` },
      { status: 400 },
    );
  }

  const result = await updateDb((db) => {
    const o = db.orders.find((x) => x.id === safeId);
    if (!o) return { error: "Order not found." as const };

    let changed = false;

    if (nextStatus && nextStatus !== o.status) {
      o.status = nextStatus as DbOrder["status"];
      o.statusHistory = [
        ...(o.statusHistory ?? [{ status: o.status, at: o.createdAt }]),
        { status: nextStatus as DbOrder["status"], at: new Date().toISOString() },
      ];
      changed = true;
    }
    if (body.trackingNumber !== undefined && nextTracking !== (o.trackingNumber ?? "")) {
      o.trackingNumber = nextTracking || undefined;
      changed = true;
    }
    if (body.trackingUrl !== undefined) {
      o.trackingUrl = nextTrackingUrl || undefined;
      changed = true;
    }
    if (body.adminNote !== undefined && nextNote !== (o.adminNote ?? "")) {
      o.adminNote = nextNote || undefined;
      changed = true;
    }

    if (!o.statusHistory?.length) {
      o.statusHistory = [{ status: o.status, at: o.createdAt }];
    }
    return { order: o, changed };
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }

  // Live update — customers tracking the order see this instantly
  if (result.changed) {
    publish({ orderId: result.order.id, status: result.order.status });
    // placed / out-for-delivery / delivered par customer email (function
    // khud gate karta hai — packed/shipped par kuch nahi).
    try {
      await sendOrderStatusEmail(result.order, result.order.status);
    } catch (e) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "order status email crashed",
          orderId: result.order.id,
          status: result.order.status,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }

  return NextResponse.json({ order: result.order });
}