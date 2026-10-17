import { NextResponse } from "next/server";
import { isValidPin } from "@/lib/server/security";
import { FREE_SHIPPING_ABOVE, ZONES, ZONE_DEFAULT_CHARGES, ZONE_LABEL, lookupPincode } from "@/lib/server/pincode";

// GET /api/pincode?pin=110001 — city/state + delivery charge lookup
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
  return NextResponse.json({
    ...result,
    codAvailable: true,
    serviceable: true,
    freeShippingAbove: FREE_SHIPPING_ABOVE,
    zones: ZONES,
    zoneLabels: ZONE_LABEL,
    defaultCharges: ZONE_DEFAULT_CHARGES,
  });
}