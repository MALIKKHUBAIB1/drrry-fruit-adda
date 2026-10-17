import fs from "node:fs";
import path from "node:path";
import { readDb, type DbPincode } from "./db";

export type Zone = "metro" | "tier2" | "tier3" | "remote";

export const ZONES: Zone[] = ["metro", "tier2", "tier3", "remote"];

// Default charges per zone (DB override is always priority)
export const ZONE_DEFAULT_CHARGES: Record<Zone, number> = {
  metro: 49,
  tier2: 69,
  tier3: 89,
  remote: 119,
};

export const ZONE_LABEL: Record<Zone, string> = {
  metro: "Metro cities",
  tier2: "Tier-2 cities",
  tier3: "Tier-3 / small towns",
  remote: "North-east & remote areas",
};

export const FREE_SHIPPING_ABOVE = 999;

/**
 * Dummy zone logic (India Post circle ke hisaab se).
 * Pehle metro prefixes, phir remote states, phir first digit.
 */
const METRO_PREFIXES = [
  "110", "111", "121", "122", // Delhi NCR
  "380", // Ahmedabad
  "400", "401", "402", "403", "411", // Mumbai + Pune
  "500", // Hyderabad
  "560", // Bengaluru
  "600", // Chennai
  "700", // Kolkata
];

const REMOTE_STATES = [
  "assam", "arunachal", "manipur", "meghalaya", "mizoram", "nagaland", "tripura",
  "sikkim", "jammu", "ladakh", "andaman", "lakshadweep",
];

export function zoneFor(pin: string, state = ""): Zone {
  const p3 = pin.slice(0, 3);
  if (METRO_PREFIXES.includes(p3)) return "metro";

  const st = state.toLowerCase();
  if (REMOTE_STATES.some((s) => st.includes(s))) return "remote";

  const d = pin.charAt(0);
  if (d === "1" || d === "4" || d === "5" || d === "6") return "tier2";
  if (d === "9") return "remote";
  return "tier3";
}

/** Backwards-compatible helper (sirf pin se) */
export const guessZone = (pin: string): Zone => zoneFor(pin);

export const zoneCharge = (zone: Zone) => ZONE_DEFAULT_CHARGES[zone] ?? 79;

// ---------- Full India dataset (lazy loaded once per process) ----------

export type PinRow = {
  pin: string;
  city: string;
  state: string;
  district: string;
  zone: Zone;
  shipping: number;
  source: "override" | "dataset" | "india-post";
};

const DATA_FILE = path.join(process.cwd(), "data", "pincodes.json");

let cache: Map<string, { city: string; state: string; district: string }> | null = null;

function loadDataset() {
  if (cache) return cache;
  const map = new Map<string, { city: string; state: string; district: string }>();
  try {
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const rows = JSON.parse(raw) as [string, string, string, string][];
    for (const [pin, city, state, district] of rows) map.set(pin, { city, state, district });
  } catch {
    // file missing / invalid — live API fallback chalega
  }
  cache = map;
  return map;
}

export const datasetCount = () => loadDataset().size;

/**
 * Admin listing: saare pincodes with zone + dummy charge.
 * DB overrides merge hote hain (per-pincode custom charge).
 */
export function listAllPincodes(opts: {
  q?: string;
  zone?: string;
  page?: number;
  limit?: number;
  overrides: DbPincode[];
}) {
  const { q = "", zone = "", page = 1, limit = 50, overrides } = opts;
  const map = loadDataset();
  const ovMap = new Map(overrides.map((o) => [o.pin, o]));
  const needle = q.trim().toLowerCase();

  const all: PinRow[] = [];
  for (const [pin, info] of map) {
    const ov = ovMap.get(pin);
    const z: Zone = ov ? ov.zone : zoneFor(pin, info.state);
    if (zone && z !== zone) continue;
    if (
      needle &&
      !`${pin} ${info.city} ${info.district} ${info.state}`.toLowerCase().includes(needle)
    )
      continue;
    all.push({
      pin,
      city: ov?.city || info.city,
      state: ov?.state || info.state,
      district: ov?.district || info.district,
      zone: z,
      shipping: ov ? ov.shipping : zoneCharge(z),
      source: ov ? "override" : "dataset",
    });
  }

  // DB-only rows (admin added custom pincode jo dataset me nahi)
  for (const ov of overrides) {
    if (map.has(ov.pin)) continue;
    if (zone && ov.zone !== zone) continue;
    if (
      needle &&
      !`${ov.pin} ${ov.city} ${ov.district} ${ov.state}`.toLowerCase().includes(needle)
    )
      continue;
    all.push({
      pin: ov.pin,
      city: ov.city,
      state: ov.state,
      district: ov.district,
      zone: ov.zone,
      shipping: ov.shipping,
      source: "override",
    });
  }

  all.sort((a, b) => a.pin.localeCompare(b.pin));
  const total = all.length;
  const start = (Math.max(1, page) - 1) * limit;
  return { rows: all.slice(start, start + limit), total, page: Math.max(1, page), limit };
}

// ---------- Single pincode lookup ----------

/** DB override → local dataset → India Post live API. */
export async function lookupPincode(pin: string): Promise<PinRow | null> {
  const db = await readDb();
  const ov = db.pincodes.find((p) => p.pin === pin);
  if (ov) {
    return {
      pin: ov.pin,
      city: ov.city,
      state: ov.state,
      district: ov.district,
      zone: ov.zone,
      shipping: ov.shipping,
      source: "override",
    };
  }

  const local = loadDataset().get(pin);
  if (local) {
    const zone = zoneFor(pin, local.state);
    return {
      pin,
      city: local.city,
      state: local.state,
      district: local.district,
      zone,
      shipping: zoneCharge(zone),
      source: "dataset",
    };
  }

  // Live fallback — India Post
  const zone = guessZone(pin);
  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
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
    const po = offices.find((o) => o.DeliveryStatus !== "Non-Delivery") ?? offices[0];
    return {
      pin,
      city: po.Division || po.District || "",
      state: po.State || "",
      district: po.District || "",
      zone,
      shipping: zoneCharge(zone),
      source: "india-post",
    };
  } catch {
    return null;
  }
}

/** Order time shipping — DB override → dataset zone → default. */
export function shippingForPin(pin: string, netAmount: number, overrides: DbPincode[]): number {
  if (netAmount <= 0) return 0;
  if (netAmount >= FREE_SHIPPING_ABOVE) return 0;
  const ov = overrides.find((o) => o.pin === pin);
  if (ov) return ov.shipping;
  const local = loadDataset().get(pin);
  return zoneCharge(zoneFor(pin, local?.state ?? ""));
}

export type { DbPincode };