import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser, newId } from "@/lib/server/auth";
import {
  cleanText,
  isValidPhone,
  isValidPin,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

function validate(body: Record<string, unknown>) {
  const name = cleanText(body.name, 80);
  const phone = String(body.phone ?? "").trim();
  const address = cleanText(body.address, 300);
  const city = cleanText(body.city, 60);
  const state = cleanText(body.state, 60);
  const pin = String(body.pin ?? "").trim();
  if (name.length < 3) return { error: "Enter the receiver's full name." };
  if (!isValidPhone(phone)) return { error: "Enter a valid 10-digit mobile number." };
  if (address.length < 10) return { error: "Enter the full street address." };
  if (!city || !state) return { error: "City and state are required." };
  if (!isValidPin(pin)) return { error: "Enter a valid 6-digit PIN code." };
  return {
    data: {
      label: cleanText(body.label, 30) || "Home",
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
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const v = validate((parsed.data ?? {}) as Record<string, unknown>);
  if ("error" in v) return NextResponse.json({ error: v.error }, { status: 400 });

  const address = await updateDb((db) => {
    const mine = db.addresses.filter((a) => a.userId === user.id);
    const isDefault = mine.length === 0 || (parsed.data as Record<string, unknown>).isDefault === true;
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
