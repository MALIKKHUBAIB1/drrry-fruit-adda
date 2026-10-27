import "server-only";
import { MongoClient, Db, Document } from "mongodb";

// Atlas connection — singleton per server process.
// MONGODB_URI .env se aati hai (gitignored). Missing ho to THROW (silently
// JSON par fallback isliye nahi: do storage backends = silent split-brain).
const uri = process.env.MONGODB_URI?.trim();
if (!uri) {
  throw new Error(
    "MONGODB_URI is not set. Add it to .env (gitignored) before starting.",
  );
}
// Throw ke baad TS ko bhi narrow karana padta hai (closure me nahi hota).
const MONGO_URI: string = uri;

let client: MongoClient | null = null;
let dbPromise: Promise<Db> | null = null;

export function mongo(): Promise<Db> {
  if (!dbPromise) {
    client = new MongoClient(MONGO_URI, {
      maxPoolSize: 10,
      minPoolSize: 0,
      serverSelectionTimeoutMS: 10_000,
      retryWrites: true,
    });
    dbPromise = client.connect().then((c) => c.db());
  }
  return dbPromise;
}

// ---------- Collection-per-entity ----------
// Har array field apni collection me rehta hai (Atlas UI me alag-alag dikhti
// hain). Jo cheezein array nahi hain (settings, carts, wishlists, hidden
// pincode list) wo `meta` collection ke ek document me hain, aur wahi
// optimistic-concurrency version (__v) bhi track karta hai.
export const META_ID = "root";

// DbShape ka array field -> collection name
export const ARRAY_COLLECTIONS = [
  "users",
  "sessions",
  "products",
  "categories",
  "hampers",
  "coupons",
  "pincodes",
  "orders",
  "contacts",
  "reviews",
  "addresses",
  "newsletter",
  "broadcasts",
  "otps",
  "notifications",
] as const;

export type ArrayCollectionName = (typeof ARRAY_COLLECTIONS)[number];

export type MetaDoc = Document & {
  _id: typeof META_ID;
  __v: number;
  updatedAt: Date;
  settings: unknown;
  hiddenPincodes: string[];
  carts: Record<string, unknown[]>;
  wishlists: Record<string, string[]>;
};

export async function metaCol() {
  const db = await mongo();
  return db.collection<MetaDoc>("meta");
}

export function arrayCol(name: ArrayCollectionName) {
  return mongo().then((db) => db.collection<Document>(name));
}

export async function ensureIndexes() {
  const db = await mongo();
  // Uniqueness — duplicate records rokta hai aur Atlas UI me bhi clear rehta hai
  await db.collection("users").createIndex({ email: 1 }, { unique: true });
  await db.collection("users").createIndex({ id: 1 }, { unique: true });
  await db.collection("products").createIndex({ slug: 1 }, { unique: true });
  await db.collection("orders").createIndex({ id: 1 }, { unique: true });
  await db.collection("orders").createIndex({ userId: 1 });
  await db.collection("sessions").createIndex({ token: 1 }, { unique: true });
  await db.collection("reviews").createIndex({ slug: 1 });
  await db.collection("meta").createIndex({ updatedAt: -1 });
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    dbPromise = null;
  }
}
