// Purani images (dryfruitadda/products/) -> naya structure
//   dryfruitadda/{year}/{category}/
//
//   node scripts/reorganize-images.mjs           # dry run (sirf mapping dikhata hai)
//   node scripts/reorganize-images.mjs --apply   # upload + DB/code update
//   node scripts/reorganize-images.mjs --apply --delete-old  # purane ImageKit files bhi hatao
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, extname } from "node:path";
import ImageKit from "imagekit";

const APPLY = process.argv.includes("--apply");
const DELETE_OLD = process.argv.includes("--delete-old");
const YEAR = new Date().getFullYear();

// local image -> category slug (DB ke categories se match)
const CATEGORY_OF = {
  "almonds.jpg": "almonds",
  "cashews.jpg": "cashews",
  "pistachios.jpg": "pistachios",
  "walnuts.jpg": "walnuts",
  "dates.jpg": "dates",
  "figs.jpg": "figs",
  "raisins.jpg": "raisins",
  "mixed.jpg": "mixed",
  "seeds.jpg": "seeds",
  "gift.jpg": "gift-hampers",
  "hero.jpg": "site",
  "logo-sm.jpg": "site",
};

function env(name) {
  const m = readFileSync(".env", "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
  if (!m) throw new Error(`missing ${name} in .env`);
  return m[1].trim().replace(/^"|"$/g, "");
}

const ik = new ImageKit({ publicKey: env("PUBLIC_KEY"), privateKey: env("PRIVATE_KEY"), urlEndpoint: env("IMAGEKIT_CDN") });

const OLD_MAP = join(process.cwd(), "scripts", ".imagekit-map.json");
const NEW_MAP = join(process.cwd(), "scripts", ".imagekit-map-v2.json");
const oldMap = existsSync(OLD_MAP) ? JSON.parse(readFileSync(OLD_MAP, "utf8")) : {};

// ImageKit unique suffix (_XXXX) hata kar original local name se match.
// e.g. almonds_UOTtyTDyL.jpg -> almonds.jpg
function localNameFrom(url) {
  const file = url.split("/").pop();
  const stem = file.replace(/\.[^.]+$/, "");
  const base = stem.replace(/_[A-Za-z0-9_-]+$/, "").toLowerCase();
  const ext = extname(file);
  const guess = `${base}${ext}`;
  if (CATEGORY_OF[guess]) return guess;
  // fallback: prefix match against known local names
  for (const k of Object.keys(CATEGORY_OF)) {
    if (k.replace(/\.[^.]+$/, "") === base) return k;
  }
  return guess;
}

const plan = {};
for (const oldUrl of Object.keys(oldMap)) {
  const local = localNameFrom(oldUrl);
  const category = CATEGORY_OF[local] ?? "uncategorised";
  plan[oldUrl] = { local, category, folder: `/dryfruitadda/${YEAR}/${category}` };
}

console.log(`planned ${Object.keys(plan).length} images -> /dryfruitadda/${YEAR}/{category}/`);
for (const [, p] of Object.entries(plan)) {
  console.log(`  ${p.local.padEnd(14)} -> ${p.folder}/`);
}

if (!APPLY) {
  console.log("\nDRY RUN — re-run with --apply to upload into new folders.");
  process.exit(0);
}

const mapping = {}; // old URL -> new URL
const filesToDelete = [];

for (const [oldUrl, p] of Object.entries(plan)) {
  const src = join(process.cwd(), "public", "images", p.local);
  const buf = readFileSync(src);
  const res = await ik.upload({
    file: buf,
    fileName: p.local,
    folder: p.folder,
    useUniqueFileName: true,
  });
  mapping[oldUrl] = res.url;
  filesToDelete.push(oldUrl);
  console.log(`  uploaded ${p.local} -> ${res.url}`);
}

writeFileSync(NEW_MAP, JSON.stringify(mapping, null, 2));
console.log(`\nmapping: ${NEW_MAP} (${Object.keys(mapping).length})`);

// ---------- DB + code update (old URL -> new URL) ----------
const { MongoClient } = await import("mongodb");
const client = new MongoClient(env("MONGODB_URI"), { serverSelectionTimeoutMS: 15000 });
await client.connect();
const db = client.db();

function walk(node) {
  if (typeof node === "string") {
    let out = node;
    for (const [fr, to] of Object.entries(mapping)) if (out.includes(fr)) out = out.split(fr).join(to);
    return out;
  }
  if (Array.isArray(node)) return node.map(walk);
  if (node && typeof node === "object") {
    for (const k of Object.keys(node)) node[k] = walk(node[k]);
    return node;
  }
  return node;
}

let replaced = 0;
for (const c of await db.listCollections().toArray()) {
  const col = db.collection(c.name);
  const docs = await col.find({}).toArray();
  let changed = 0;
  for (const d of docs) {
    const before = JSON.stringify(d);
    const next = walk(d);
    if (JSON.stringify(next) !== before) {
      await col.replaceOne({ _id: d._id }, next);
      changed++; replaced++;
    }
  }
  if (changed) console.log(`  db.${c.name}: ${changed}`);
}
console.log(`DB: ${replaced} doc(s) updated`);

// source files
let codeRefs = 0;
for (const pat of ["**/*.ts", "**/*.tsx"]) {
  for (const f of (await import("node:fs")).globSync(pat, { cwd: process.cwd() })) {
    const path = join(process.cwd(), f);
    if (path.includes("node_modules") || path.includes(".next")) continue;
    let s;
    try { s = readFileSync(path, "utf8"); } catch { continue; }
    const before = s;
    for (const [fr, to] of Object.entries(mapping)) if (s.includes(fr)) s = s.split(fr).join(to);
    if (s !== before) { writeFileSync(path, s); codeRefs++; }
  }
}
console.log(`code: ${codeRefs} file(s) updated`);

// ---------- optional: purane ImageKit files delete ----------
if (DELETE_OLD) {
  let deleted = 0;
  for (const oldUrl of filesToDelete) {
    try {
      const name = oldUrl.split("/").pop();
      const files = await ik.listFiles({ searchQuery: name });
      for (const f of files) {
        if (f.url === oldUrl) { await ik.deleteFile(f.fileId); deleted++; }
      }
    } catch (e) { console.warn(`  delete failed ${oldUrl}: ${e.message}`); }
  }
  console.log(`ImageKit: ${deleted} old file(s) deleted`);
} else {
  console.log("old ImageKit files kept (use --delete-old to remove)");
}

await client.close();
console.log("\nAPPLIED");
