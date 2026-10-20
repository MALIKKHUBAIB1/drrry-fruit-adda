// One-time migration: data/db.json -> MongoDB Atlas.
//
//   node scripts/migrate-json-to-mongo.mjs            # dry run (kuch nahi likhta)
//   node scripts/migrate-json-to-mongo.mjs --write     # actual write
//   node scripts/migrate-json-to-mongo.mjs --write --force  # overwrite existing root doc
//
// Safe by default: dry-run. --force ke bina existing root document overwrite
// nahi hota (pehle se migrated DB me data loss nahi hoga).
import { readFileSync, existsSync } from "node:fs";
import { MongoClient } from "mongodb";

const args = new Set(process.argv.slice(2));
const DRY = !args.has("--write");
const FORCE = args.has("--force");

const JSON_PATH = process.cwd() + "/data/db.json";
const COLLECTION = "app_state";

function counts(data) {
  const out = {};
  for (const [k, v] of Object.entries(data)) {
    out[k] = Array.isArray(v) ? v.length : typeof v === "object" ? Object.keys(v || {}).length : v;
  }
  return out;
}

if (!existsSync(JSON_PATH)) {
  console.error(`not found: ${JSON_PATH}`);
  process.exit(1);
}

const env = readFileSync(process.cwd() + "/.env", "utf8");
const uri = env.match(/^MONGODB_URI=(.+)$/m)?.[1]?.trim();
if (!uri) {
  console.error("MONGODB_URI not set in .env");
  process.exit(1);
}

const raw = JSON.parse(readFileSync(JSON_PATH, "utf8"));
console.log("source:", JSON_PATH);
console.log("counts:", JSON.stringify(counts(raw), null, 2));

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const col = client.db().collection(COLLECTION);

const existing = await col.findOne({ _id: "root" });
if (existing && !FORCE) {
  console.log("\nroot document ALREADY EXISTS — refusing to overwrite.");
  console.log("Re-run with --force to overwrite, or skip migration.");
  await client.close();
  process.exit(existing.data?.orders?.length ? 0 : 2);
}

if (DRY) {
  console.log(`\nDRY RUN — would upsert root doc (${JSON.stringify(raw).length} bytes) into ${COLLECTION}.`);
  console.log("Re-run with --write to apply.");
  await client.close();
  process.exit(0);
}

const res = await col.replaceOne(
  { _id: "root" },
  { _id: "root", data: raw, __v: 0, updatedAt: new Date() },
  { upsert: true },
);

const check = await col.findOne({ _id: "root" });
console.log("\nMIGRATED");
console.log("  matched:", res.matchedCount, "modified:", res.modifiedCount, "upsertedId:", res.upsertedId ?? "-");
console.log("  verify  orders:", check?.data?.orders?.length, "users:", check?.data?.users?.length, "products:", check?.data?.products?.length);
console.log("  bytes   :", JSON.stringify(check?.data).length);

await client.close();
