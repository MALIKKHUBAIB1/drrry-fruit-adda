import { readDb, type DbPincode } from "./db";

export type Zone = "metro" | "tier2" | "tier3" | "remote";

export const ZONES: Zone[] = ["metro", "tier2", "tier3", "remote"];

// Default charges per zone (admin DB rows override kar sakte hain)
export const ZONE_DEFAULT_CHARGES: Record<Zone, number> = {
  metro: 49,
  tier2: 69,
  tier3: 89,
  remote: 119,
};

// Pincode prefix (first digit) se rough zone guess — jab DB me exact na ho.
export function guessZone(pin: string): Zone {
  const d = pin.charAt(0);
  // 1,2,3,4,5,6 → North/South/West/East/Central zones
  if (d === "1") return "metro"; // Delhi NCR
  if (d === "4") return "metro"; // Mumbai, Pune, Ahmedabad...
  if (d === "5") return "tier2"; // West central
  if (d === "6") return "tier2"; // Chennai, Bangalore, Hyderabad
  if (d === "7") return "tier3"; // Kolkata, Patna
  if (d === "8") return "tier3"; // North East, some west
  if (d === "9") return "remote"; // North East, J&K, islands
  return "tier3";
}

export type PincodeResult = {
  pin: string;
  city: string;
  state: string;
  district: string;
  zone: Zone;
  shipping: number;
  codAvailable: boolean;
  serviceable: boolean;
  source: "db" | "india-post";
};

/** DB me exact pincode ho to use (admin override). warna India Post API. */
export async function lookupPincode(pin: string): Promise<PincodeResult | null> {
  const db = await readDb();
  const row = db.pincodes.find((p) => p.pin === pin);
  if (row) {
    return {
      pin: row.pin,
      city: row.city,
      state: row.state,
      district: row.district,
      zone: row.zone,
      shipping: row.shipping,
      codAvailable: row.codAvailable,
      serviceable: row.serviceable,
      source: "db",
    };
  }

  // India Post live lookup
  const zone = guessZone(pin);
  const fallback = ZONE_DEFAULT_CHARGES[zone];
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(6000),
    });
    if (!res.ok) return null;
    // API ek array return karti hai: [{ Status, PostOffice: [...] }]
    const raw = (await res.json()) as unknown;
    const arr = Array.isArray(raw) ? raw : [raw];
    const first = arr[0] as {
      Status?: string;
      PostOffice?: {
        District?: string;
        State?: string;
        Division?: string;
        DeliveryStatus?: string;
      }[];
    } | undefined;
    if (!first || first.Status !== "Success") return null;
    const offices = first.PostOffice ?? [];
    if (offices.length === 0) return null;
    // Serviceable office prefer karo, warna pehla wala
    const po = offices.find((o) => o.DeliveryStatus !== "Non-Delivery") ?? offices[0];
    const city = po.Division || po.District || "";
    const state = po.State || "";
    const serviceable = offices.some((o) => o.DeliveryStatus !== "Non-Delivery");
    return {
      pin,
      city,
      state,
      district: po.District || "",
      zone,
      shipping: fallback,
      codAvailable: true,
      serviceable,
      source: "india-post",
    };
  } catch {
    return null;
  }
}

/** Order ke time pe shipping charge — DB row ya zone default. */
export async function shippingForPincode(pin: string, netAmount: number): Promise<number> {
  if (netAmount <= 0) return 0;
  const db = await readDb();
  const row = db.pincodes.find((p) => p.pin === pin);
  const zone = row?.zone ?? guessZone(pin);
  const charge = row ? row.shipping : ZONE_DEFAULT_CHARGES[zone];
  // Free shipping threshold
  if (netAmount >= 999) return 0;
  return charge;
}

export type { DbPincode };