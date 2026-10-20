// Local /images/*.jpg  ->  ImageKit CDN. Do cheezein badalta hai:
//   1. har image ko ImageKit pe upload karta hai
//   2. MongoDB ke poore data me aur lib/products.ts (seed source) me
//      /images/X.jpg references ko ImageKit URL se replace karta hai
//
//   node scripts/upload-images-to-imagekit.mjs           # dry run (sirf upload)
//   node scripts/upload-images-to-imagekit.mjs --apply   # upload + DB/code update
//
// Idempotent: jo image pehle se upload ho chuki ho aur mapping file me ho,
// dobara upload nahi karta (purane URLs reuse).
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from "node:fs";
import { join, extname } from "node:path";
import ImageKit from "imagekit";

const APPLY = process.argv.includes("--apply");
const IMG_DIR = join(process.cwd(), "public", "images");
const MAP_PATH = join(process.cwd(), "scripts", ".imagekit-map.json");
const FOLDER = "/dryfruitadda/products";

function env(name) {
  const m = readFileSync(".env", "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!m) throw new Error(`missing ${name} in .env`);
  return m[1].trim().replace(/^"|"$/g, "");
}

const ik = new ImageKit({
  publicKey: env("PUBLIC_KEY"),
  privateKey: env("PRIVATE_KEY"),
  urlEndpoint: env("IMAGEKIT_CDN"),
});

// Purani mapping (dobara chalane pe reuse)
const map = existsSync(MAP_PATH) ? JSON.parse(readFileSync(MAP_PATH, "utf8")) : {};

const files = readdirSync(IMG_DIR).filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f));
console.log(`found ${files.length} local images in public/images/`);
if (Object.keys(map).length) console.log(`reusing ${Object.keys(map).length} previously uploaded URLs`);

for (const f of files) {
  const rel = `/images/${f}`;
  if (map[rel]) {
    console.log(`  skip (cached) ${rel}`);
    continue;
  }
  const buf = readFileSync(join(IMG_DIR, f));
  const base = f.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const res = await ik.upload({
    file: buf,
    fileName: `${base}${extname(f)}`,
    folder: FOLDER,
    useUniqueFileName: true,
  });
  map[rel] = res.url;
  console.log(`  uploaded ${rel} -> ${res.url}`);
}
writeFileSync(MAP_PATH, JSON.stringify(map, null, 2));
console.log(`\nmapping saved: ${MAP_PATH} (${Object.keys(map).length} entries)`);
console.log(`live urls host: ${new URL(Object.values(map)[0]).host}`);

if (!APPLY) {
  console.log("\nDRY RUN — DB and code untouched. Re-run with --apply to replace references.");
  process.exit(0);
}

// ---------- 1. MongoDB me sab references replace ----------
const { MongoClient } = await import("mongodb");
const uri = env("MONGODB_URI");
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db();

const collections = await db.listCollections().toArray();
let replaced = 0;
let scanned = 0;

// Har document ke andar recursively /images/X replace karo (string fields).
function walk(node) {
  if (typeof node === "string") {
    scanned++;
    let out = node;
    for (const [from, to] of Object.entries(map)) {
      if (out.includes(from)) out = out.split(from).join(to);
    }
    if (out !== node) replaced++;
    return out;
  }
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) node[k] = walk(node[k]);
    return node;
  }
  return node;
}

for (const c of collections) {
  if (c.name === "meta") continue; // settings/carts me images nahi, phir bhi safe hai
  const col = db.collection(c.name);
  const docs = await col.find({}).toArray();
  let changed = 0;
  for (const d of docs) {
    const before = JSON.stringify(d);
    const next = walk(d);
    if (JSON.stringify(next) !== before) {
      await col.replaceOne({ _id: d._id }, next);
      changed++;
    }
  }
  if (changed) console.log(`  db.${c.name}: ${changed} doc(s) updated`);
}

console.log(`\nDB: ${replaced} string field(s) replaced across ${scanned} scanned`);

// ---------- 2. Seed source (lib/products.ts) ----------
const seedPath = join(process.cwd(), "lib", "products.ts");
let seed = readFileSync(seedPath, "utf8");
let seedReplaced = 0;
for (const [from, to] of Object.entries(map)) {
  if (seed.includes(from)) {
    seedReplaced += seed.split(from).length - 1;
    seed = seed.split(from).join(to);
  }
}
if (seedReplaced) writeFileSync(seedPath, seed);
console.log(`seed file (lib/products.ts): ${seedReplaced} reference(s) replaced`);

await client.close();
console.log("\nAPPLIED");
