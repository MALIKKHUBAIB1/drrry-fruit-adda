import { NextResponse } from "next/server";
import { isValidPin } from "@/lib/server/security";
import { ZONE_DEFAULT_CHARGES, ZONES, lookupPincode } from "@/lib/server/pincode";

// GET /api/pincode?pin=110001 — pincode lookup + zone shipping charge
export async function GET(req: Request) {
  const pin = new URL(req.url).searchParams.get("pin")?.trim() ?? "";
  if (!isValidPin(pin)) {
    return NextResponse.json({ error: "Enter a valid 6-digit PIN code." }, { status: 400 });
  }
  const result = await lookupPincode(pin);
  if (!result) {
    return NextResponse.json(
      { error: "We couldn't verify this PIN code. Please check and try again." },
      { status: 404 },
    );
  }
  return NextResponse.json({ ...result, zones: ZONES, defaultCharges: ZONE_DEFAULT_CHARGES });
}