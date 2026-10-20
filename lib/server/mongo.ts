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

export const STATE_COLLECTION = "app_state";
export const ROOT_ID = "root";

// Whole-app state ek hi document me (read-modify-write contract preserve karne
// ke liye). `__v` optimistic-concurrency version hai — lost updates rokta hai.
export type StateDoc = Document & {
  _id: typeof ROOT_ID;
  data: unknown;
  __v: number;
  updatedAt: Date;
};

export async function ensureIndexes() {
  const db = await mongo();
  const state = db.collection<StateDoc>(STATE_COLLECTION);
  await state.createIndex({ updatedAt: -1 });
}

export async function closeMongo() {
  if (client) {
    await client.close();
    client = null;
    dbPromise = null;
  }
}
