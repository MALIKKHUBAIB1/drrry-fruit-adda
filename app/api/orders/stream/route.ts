import { NextResponse, type NextRequest } from "next/server";
import { subscribe } from "@/lib/server/events";
import { readDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";

// GET /api/orders/stream — SSE for live order status
export const dynamic = "force-dynamic";

// Doosre user ke order ki stream nahi milni chahiye.
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) {
    return NextResponse.json({ error: "Login required." }, { status: 401 });
  }

  const db = await readDb();
  const owned = new Set(db.orders.filter((o) => o.userId === user.id).map((o) => o.id));

  // Admin ko sab dikhna chahiye (fulfilment ke liye), customer ko sirf apne.
  const isAdmin = !!user.isAdmin;

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let beat: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: unknown) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream closed
        }
      };

      send({ type: "connected", at: Date.now() });

      // Ownership filter: pehle har event HAR listener ko jata tha, jisse
      // koi bhi anonymous visitor har order ki ID + status live dekh sakta tha.
      unsubscribe = subscribe((evt) => {
        if (!isAdmin && !owned.has(evt.orderId)) return;
        send({ type: "order", orderId: evt.orderId, status: evt.status });
      });

      beat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: ping\n\n`));
        } catch {
          if (beat) clearInterval(beat);
        }
      }, 25_000);

      const cleanup = () => {
        if (beat) clearInterval(beat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          // already closed
        }
      };
      req.signal.addEventListener("abort", cleanup);
    },
    cancel() {
      if (beat) clearInterval(beat);
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}