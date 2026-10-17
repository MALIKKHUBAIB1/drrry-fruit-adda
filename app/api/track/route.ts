import { NextResponse } from "next/server";
import { readDb } from "@/lib/server/db";
import { cleanText, rateLimit, readJsonSafe, sameOrigin } from "@/lib/server/security";
import { STATUS_LABEL } from "@/lib/server/events";

export type TrackResult = {
  id: string;
  status: string;
  statusLabel: string;
  placedAt: string;
  items: { name: string; variant: string; qty: number; image: string }[];
  itemCount: number;
  total: number;
  payment: "cod" | "online";
  deliveryLabel?: string;
  deliveryDays?: number;
  trackingNumber?: string;
  trackingUrl?: string;
  adminNote?: string;
  city: string;
  pin: string;
  history: { status: string; statusLabel: string; at: string; note?: string }[];
};

function toTrackResult(o: any): TrackResult {
  const history = (o.statusHistory ?? [{ status: o.status, at: o.createdAt }]).map((h: any) => ({
    status: h.status,
    statusLabel: STATUS_LABEL[h.status as keyof typeof STATUS_LABEL] ?? h.status,
    at: h.at,
    note: h.note,
  }));
  return {
    id: o.id,
    status: o.status,
    statusLabel: STATUS_LABEL[o.status as keyof typeof STATUS_LABEL] ?? o.status,
    placedAt: o.createdAt,
    items: o.items.map((i: any) => ({ name: i.name, variant: i.variant, qty: i.qty, image: i.image })),
    itemCount: o.items.reduce((s: number, i: any) => s + i.qty, 0),
    total: o.total,
    payment: o.payment,
    deliveryLabel: o.deliveryLabel,
    deliveryDays: o.deliveryDays,
    trackingNumber: o.trackingNumber,
    trackingUrl: o.trackingUrl,
    adminNote: o.adminNote,
    city: o.city,
    pin: o.pin,
    history,
  };
}

// POST /api/track { orderId, email } — public order tracking (email verify required)
export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`track:${ip}`, 20, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests. Please try again." }, { status: 429 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const orderId = cleanText(body.orderId, 40).toUpperCase();
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  if (!orderId) return NextResponse.json({ error: "Enter your order ID." }, { status: 400 });
  if (!email) return NextResponse.json({ error: "Enter the email used for the order." }, { status: 400 });

  const db = await readDb();
  const order = db.orders.find(
    (o) => o.id.toUpperCase() === orderId && o.email.toLowerCase() === email,
  );
  if (!order) {
    return NextResponse.json(
      { error: "No order found with this ID and email. Please check and try again." },
      { status: 404 },
    );
  }
  return NextResponse.json({ order: toTrackResult(order) });
}

// GET /api/track?id=DFA-XXXX — live fetch (SSE ke baad refresh/poll ke liye)
export async function GET(req: Request) {
  const sp = new URL(req.url).searchParams;
  const orderId = cleanText(sp.get("id") ?? "", 40).toUpperCase();
  const email = String(sp.get("email") ?? "").trim().toLowerCase().slice(0, 254);
  if (!orderId || !email) {
    return NextResponse.json({ error: "id and email required." }, { status: 400 });
  }
  const db = await readDb();
  const order = db.orders.find(
    (o) => o.id.toUpperCase() === orderId && o.email.toLowerCase() === email,
  );
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order: toTrackResult(order) });
}