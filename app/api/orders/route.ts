import { NextResponse, type NextRequest } from "next/server";
import { readDb, shippingFor, updateDb, type DbOrder } from "@/lib/server/db";
import { getSessionUser, newId } from "@/lib/server/auth";

type OrderBody = {
  items: { slug: string; variant: string; qty: number }[];
  coupon?: string | null;
  name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  notes?: string;
  payment?: "cod" | "online";
};

// GET /api/orders — apne orders (login required)
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const db = await readDb();
  const orders = db.orders
    .filter((o) => o.userId === user.id)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return NextResponse.json({ orders });
}

// POST /api/orders — checkout (server totals authoritative hain)
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as OrderBody;
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? user.email).trim();
  const address = String(body.address ?? "").trim();
  const city = String(body.city ?? "").trim();
  const state = String(body.state ?? "").trim();
  const pin = String(body.pin ?? "").trim();
  const payment = body.payment === "online" ? "online" : "cod";
  const items = Array.isArray(body.items) ? body.items : [];

  if (name.length < 3) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  if (!/^[6-9]\d{9}$/.test(phone))
    return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (address.length < 10)
    return NextResponse.json({ error: "Enter your full street address." }, { status: 400 });
  if (!city || !state) return NextResponse.json({ error: "City and state required." }, { status: 400 });
  if (!/^[1-9]\d{5}$/.test(pin))
    return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });
  if (items.length === 0) return NextResponse.json({ error: "Cart is empty." }, { status: 400 });

  const order = await updateDb((db) => {
    // Price DB se — client price par bharosa nahi
    const lines = items.map((it) => {
      const p = db.products.find((x) => x.slug === it.slug);
      const v = p?.variants.find((x) => x.label === it.variant);
      if (!p || !v) throw new Error(`Invalid item: ${it.slug} (${it.variant})`);
      if (!p.inStock) throw new Error(`${p.name} is out of stock.`);
      return {
        slug: p.slug,
        name: p.name,
        variant: it.variant,
        qty: Math.max(1, Math.min(20, Number(it.qty) || 1)),
        price: v.price,
        mrp: v.mrp,
        image: p.image,
      };
    });

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    let discount = 0;
    let coupon: string | null = null;
    const code = String(body.coupon ?? "").trim().toUpperCase();
    if (code) {
      const c = db.coupons.find((x) => x.code === code && x.active);
      if (!c) throw new Error("This discount code isn't valid.");
      if (subtotal < c.min) throw new Error(`Add items worth ₹${c.min.toLocaleString("en-IN")} to use ${c.code}.`);
      discount = Math.round((subtotal * c.pct) / 100);
      coupon = c.code;
    }
    const shipping = shippingFor(subtotal - discount);
    const total = subtotal - discount + shipping;

    const o: DbOrder = {
      id: `DFA-${Date.now().toString(36).toUpperCase().slice(-6)}${newId("").slice(-3)}`,
      userId: user.id,
      email,
      items: lines,
      subtotal,
      discount,
      shipping,
      total,
      coupon,
      name,
      phone,
      address,
      city,
      state,
      pin,
      notes: String(body.notes ?? ""),
      payment,
      status: "placed",
      createdAt: new Date().toISOString(),
    };
    db.orders.unshift(o);
    db.carts[user.id] = []; // order ke baad cart clear
    return o;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as DbOrder);

  if ((order as unknown as { __error?: string }).__error) {
    return NextResponse.json(
      { error: (order as unknown as { __error: string }).__error },
      { status: 400 },
    );
  }
  return NextResponse.json({ order }, { status: 201 });
}
