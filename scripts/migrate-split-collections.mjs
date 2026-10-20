// Split the single-document `app_state` store into per-entity collections.
//
//   node scripts/migrate-split-collections.mjs           # dry run
//   node scripts/migrate-split-collections.mjs --write   # apply
//   node scripts/migrate-split-collections.mjs --write --drop  # + drop app_state
//
// Safe by default. --drop ke bina purana app_state document rehne deta hai
// (backup) taaki rollback possible rahe.
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";

const args = new Set(process.argv.slice(2));
const DRY = !args.has("--write");
const DROP = args.has("--drop");

// DbShape ke array fields -> collections (mongo.ts ke ARRAY_COLLECTIONS se
// match hona chahiye).
const ARRAY_COLLECTIONS = [
  "users", "sessions", "products", "categories", "hampers", "coupons",
  "pincodes", "orders", "contacts", "reviews", "addresses", "newsletter",
];
// Non-array fields meta document me jate hain.
const META_FIELDS = ["settings", "hiddenPincodes", "carts", "wishlists"];

const env = readFileSync(process.cwd() + "/.env", "utf8");
const uri = env.match(/^MONGODB_URI=(.+)$/m)?.[1]?.trim();
if (!uri) { console.error("MONGODB_URI not set in .env"); process.exit(1); }

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db();

const appState = await db.collection("app_state").findOne({ _id: "root" });
if (!appState?.data) {
  console.error("no app_state root document found — nothing to split");
  await client.close();
  process.exit(1);
}
const data = appState.data;

const plan = {};
for (const n of ARRAY_COLLECTIONS) {
  const rows = Array.isArray(data[n]) ? data[n] : [];
  plan[n] = rows.length;
}
for (const n of META_FIELDS) plan[`meta.${n}`] = data[n] === undefined ? "missing" : "ok";

console.log("SOURCE  dryfruitadda.app_state (1 document)");
console.log("TARGET  dryfruitadda.{ " + ARRAY_COLLECTIONS.join(", ") + " } + meta");
console.log("\nplan:", JSON.stringify(plan, null, 2));

// Existing data check — kahin pehle se collections bane hue toh na overwrite ho
const existing = [];
for (const n of [...ARRAY_COLLECTIONS, "meta"]) {
  const c = await db.collection(n).countDocuments();
  if (c > 0) existing.push(`${n}=${c}`);
}
if (existing.length && !args.has("--force")) {
  console.log(`\ncollections already populated: ${existing.join(", ")}`);
  console.log("Re-run with --force to overwrite.");
  await client.close();
  process.exit(2);
}

if (DRY) {
  console.log("\nDRY RUN — nothing written. Re-run with --write.");
  await client.close();
  process.exit(0);
}

const metaDoc = {
  _id: "root",
  __v: appState.__v ?? 0,
  updatedAt: new Date(),
};
for (const n of META_FIELDS) metaDoc[n] = data[n] ?? (n === "hiddenPincodes" ? [] : {});

await db.collection("meta").replaceOne({ _id: "root" }, metaDoc, { upsert: true });

for (const n of ARRAY_COLLECTIONS) {
  const rows = Array.isArray(data[n]) ? data[n] : [];
  const col = db.collection(n);
  await col.deleteMany({});
  if (rows.length) await col.insertMany(rows);
}

console.log("\nSPLIT DONE");
for (const n of ARRAY_COLLECTIONS) {
  const c = await db.collection(n).countDocuments();
  console.log(`  ${n.padEnd(12)} ${c}`);
}
const m = await db.collection("meta").findOne({ _id: "root" });
console.log(`  meta         __v=${m.__v} settings=${!!m.settings} carts=${Object.keys(m.carts||{}).length}`);

if (DROP) {
  await db.collection("app_state").drop().catch(() => {});
  console.log("\ndropped app_state (rollback no longer possible)");
} else {
  console.log("\nkept app_state as rollback backup (use --drop to remove)");
}

await client.close();
