// Indexes create/refresh karta hai. Safe hai — dobara chalana OK.
//   node scripts/create-indexes.mjs
import { readFileSync } from "node:fs";
import { MongoClient } from "mongodb";
const env = readFileSync(process.cwd() + "/.env", "utf8");
const uri = env.match(/^MONGODB_URI=(.+)$/m)?.[1]?.trim();
if (!uri) { console.error("MONGODB_URI not set in .env"); process.exit(1); }
const c = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await c.connect();
const db = c.db();
const specs = [
  ["users", { email: 1 }, { unique: true }],
  ["users", { id: 1 }, { unique: true }],
  ["products", { slug: 1 }, { unique: true }],
  ["orders", { id: 1 }, { unique: true }],
  ["orders", { userId: 1 }],
  ["sessions", { token: 1 }, { unique: true }],
  ["reviews", { slug: 1 }],
  ["meta", { updatedAt: -1 }],
];
for (const [col, key, opts] of specs) {
  await db.collection(col).createIndex(key, opts ?? {});
  console.log(`  ${col.padEnd(10)} ${Object.keys(key).join(",")}${opts?.unique ? " (unique)" : ""}`);
}
console.log("indexes ready");
await c.close();
