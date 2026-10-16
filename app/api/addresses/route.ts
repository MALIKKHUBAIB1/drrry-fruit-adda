import { NextResponse, type NextRequest } from "next/server";
import { updateDb, readDb } from "@/lib/server/db";
import { getSessionUser, newId } from "@/lib/server/auth";

function validate(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const address = String(body.address ?? "").trim();
  const city = String(body.city ?? "").trim();
  const state = String(body.state ?? "").trim();
  const pin = String(body.pin ?? "").trim();
  if (name.length < 3) return { error: "Enter the receiver's full name." };
  if (!/^[6-9]\d{9}$/.test(phone)) return { error: "Enter a valid 10-digit mobile number." };
  if (address.length < 10) return { error: "Enter the full street address." };
  if (!city || !state) return { error: "City and state are required." };
  if (!/^[1-9]\d{5}$/.test(pin)) return { error: "Enter a valid 6-digit PIN code." };
  return {
    data: {
      label: String(body.label ?? "Home").trim().slice(0, 30) || "Home",
      name, phone, address, city, state, pin,
    },
  };
}

// GET /api/addresses — apne saved addresses
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const db = await readDb();
  const addresses = db.addresses
    .filter((a) => a.userId === user.id)
    .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
  return NextResponse.json({ addresses });
}

// POST /api/addresses — naya address save karo
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const v = validate(body);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const address = await updateDb((db) => {
    const mine = db.addresses.filter((a) => a.userId === user.id);
    const isDefault = mine.length === 0 || body.isDefault === true;
    if (isDefault) mine.forEach((a) => (a.isDefault = false));
    const a = {
      id: newId("A-"),
      userId: user.id,
      ...v.data,
      isDefault,
      createdAt: new Date().toISOString(),
    };
    db.addresses.push(a);
    return a;
  });
  return NextResponse.json({ address }, { status: 201 });
}
