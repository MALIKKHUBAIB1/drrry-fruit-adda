import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb, type DbOrder } from "@/lib/server/db";
import { getSessionUser, newId } from "@/lib/server/auth";
import { couponStatus } from "@/lib/server/db";
import { optionsOf } from "@/lib/products";
import { shippingForPin } from "@/lib/server/pincode";
import { sendOrderStatusEmail } from "@/lib/server/ordermail";
import {
  cleanText,
  isValidEmail,
  isValidPhone,
  isValidPin,
  readJsonSafe,
  sameOrigin,
  toInt,
} from "@/lib/server/security";

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
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const parsed = await readJsonSafe(req, 50_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const name = cleanText(body.name, 80);
  const phone = String(body.phone ?? "").trim();
  const email = String(body.email ?? user.email).trim().toLowerCase().slice(0, 254);
  const address = cleanText(body.address, 300);
  const city = cleanText(body.city, 60);
  const state = cleanText(body.state, 60);
  const pin = String(body.pin ?? "").trim();
  const payment = body.payment === "online" ? "online" : "cod";
  const items = Array.isArray(body.items) ? body.items : [];
  const notes = cleanText(body.notes, 500);

  if (name.length < 3) return NextResponse.json({ error: "Enter your full name." }, { status: 400 });
  if (!isValidPhone(phone)) return NextResponse.json({ error: "Enter a valid 10-digit mobile number." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (address.length < 10) return NextResponse.json({ error: "Enter your full street address." }, { status: 400 });
  if (!city || !state) return NextResponse.json({ error: "City and state required." }, { status: 400 });
  if (!isValidPin(pin)) return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });
  if (items.length === 0 || items.length > 50) return NextResponse.json({ error: "Cart is empty or too large." }, { status: 400 });

  const order = await updateDb((db) => {
    // Duplicate (slug, variant) lines ko PEHLE merge karo. Bina iske per-line
    // qty cap (20) bypass ho jata tha: 50 identical lines => 1000 units of a
    // single SKU, jabki policy 20 hai.
    const merged = new Map<string, number>();
    for (const it of items) {
      const o = it as Record<string, unknown>;
      const key = `${cleanText(o.slug, 80)}::${cleanText(o.variant, 40)}`;
      merged.set(key, (merged.get(key) ?? 0) + toInt(o.qty, 1, 20));
    }

    const lines: { slug: string; name: string; variant: string; qty: number; price: number; mrp: number; image: string }[] = [];
    for (const [key, rawQty] of merged) {
      const [slug, variant] = key.split("::");
      // Hard cap: merged total bhi 20 se zyada nahi ho sakta.
      const qty = Math.min(rawQty, 20);
      const p = db.products.find((x) => x.slug === slug);
      const v = p?.variants.find((x) => x.label === variant);
      if (!p || !v) throw new Error(`Invalid item: ${slug} (${variant})`);
      if (!p.inStock) throw new Error(`${p.name} is out of stock.`);
      lines.push({
        slug: p.slug,
        name: p.name,
        variant,
        qty,
        price: v.price,
        mrp: v.mrp,
        image: p.image,
      });
    }

    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    let discount = 0;
    let coupon: string | null = null;
    const code = cleanText(body.coupon, 30).toUpperCase();
    if (code) {
      const c = db.coupons.find((x) => x.code === code);
      if (!c) throw new Error("This discount code isn't valid.");
      const st = couponStatus(c);
      if (st !== "active") throw new Error(st === "expired" ? "This coupon has expired." : "This coupon is no longer valid.");
      if (subtotal < c.min) throw new Error(`Add items worth ₹${c.min.toLocaleString("en-IN")} to use ${c.code}.`);
      discount = Math.round((subtotal * c.pct) / 100);
      coupon = c.code;
      c.usedCount = (c.usedCount ?? 0) + 1;
    }
    const shipping = shippingForPin(pin, subtotal - discount, db.pincodes, db.hiddenPincodes);

    // Delivery option surcharge — cart ke sabhi products me se max (sabse upar wala)
    const optionId = cleanText(body.deliveryOptionId, 40) || "standard";
    let optLabel = "Standard Delivery";
    let optDays = 5;
    let optSurcharge = 0;
    if (optionId) {
      let maxSurcharge = -1;
      let maxDays = 0;
      let found = false;
      for (const line of lines) {
        const p = db.products.find((x) => x.slug === line.slug);
        // optionsOf() product ke apne options use karta hai, warna shared defaults
        const opt = optionsOf(p).find((o) => o.id === optionId);
        if (opt) {
          found = true;
          if (opt.surcharge > maxSurcharge) {
            maxSurcharge = opt.surcharge;
            optLabel = opt.label;
            optDays = opt.days;
          }
          // ETA: sabse slow (sabse zyada days)
          if (opt.days > maxDays) maxDays = opt.days;
        }
      }
      if (found && maxSurcharge >= 0) {
        optSurcharge = maxSurcharge;
        optDays = maxDays;
      } else {
        optSurcharge = 0;
        optLabel = "Standard Delivery";
        optDays = 5;
      }
    }
    const shippingTotal = shipping + optSurcharge;
    const total = subtotal - discount + shippingTotal;

    const o: DbOrder = {
      id: `DFA-${Date.now().toString(36).toUpperCase().slice(-6)}${newId("").slice(-3)}`,
      userId: user.id,
      email,
      items: lines,
      subtotal,
      discount,
      shipping: shippingTotal,
      total,
      coupon,
      name,
      phone,
      address,
      city,
      state,
      pin,
      notes,
      payment,
      deliveryOptionId: optionId,
      deliveryLabel: optLabel,
      deliveryDays: optDays,
      status: "placed",
      statusHistory: [{ status: "placed", at: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    db.orders.unshift(o);
    db.carts[user.id] = [];
    return o;
  }).catch((e: Error) => ({ __error: e.message }) as unknown as DbOrder);

  if ((order as unknown as { __error?: string }).__error) {
    return NextResponse.json(
      { error: (order as unknown as { __error: string }).__error },
      { status: 400 },
    );
  }
  // Confirmation email — COD yahin; online orders payment verify hone par
  // (paid tabhi "confirmed" hota hai). Best effort — fail par order theek.
  if (payment === "cod") {
    try {
      await sendOrderStatusEmail(order, "placed");
    } catch (e) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "order placed email crashed",
          orderId: order.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }
  return NextResponse.json({ order }, { status: 201 });
}
