import { promises as fs } from "node:fs";
import path from "node:path";
import { categories, products as seedProducts, type Product } from "@/lib/products";
import { hashPassword, newId } from "./crypto";

export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@dryfruitadda.in";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123";

// Admin password hash ek baar per server-start compute hota hai
// (har API request par scrypt chalana heavy padega).
let cachedPass = "";
let cachedSalt = "";
let cachedHash = "";
function adminCreds() {
  if (ADMIN_PASSWORD !== cachedPass) {
    const { salt, hash } = hashPassword(ADMIN_PASSWORD);
    cachedPass = ADMIN_PASSWORD;
    cachedSalt = salt;
    cachedHash = hash;
  }
  return { salt: cachedSalt, hash: cachedHash };
}

// ---------- Types ----------

export type DbUser = {
  id: string;
  name: string;
  email: string;
  passHash: string;
  salt: string;
  isAdmin: boolean;
  createdAt: string;
};

export type DbSession = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type DbCoupon = {
  code: string;
  pct: number;
  min: number;
  label: string;
  active: boolean;
};

export type OrderItem = {
  slug: string;
  name: string;
  variant: string;
  qty: number;
  price: number;
  mrp: number;
  image: string;
};

export type DbOrder = {
  id: string;
  userId: string;
  email: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon: string | null;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  notes: string;
  payment: "cod" | "online";
  status: "placed" | "shipped" | "delivered" | "cancelled";
  createdAt: string;
};

export type DbContact = {
  id: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  createdAt: string;
};

export type DbReview = {
  id: string;
  productSlug: string;
  userId: string;
  userName: string;
  rating: number; // 1-5
  title: string;
  comment: string;
  createdAt: string;
};

export type CartItem = { slug: string; variant: string; qty: number };

export type DbAddress = {
  id: string;
  userId: string;
  label: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pin: string;
  isDefault: boolean;
  createdAt: string;
};

export type DbSubscriber = { email: string; createdAt: string };

export type DbCategory = {
  slug: string;
  name: string;
  image: string;
};

export type DbShape = {
  users: DbUser[];
  sessions: DbSession[];
  products: Product[];
  categories: DbCategory[];
  coupons: DbCoupon[];
  orders: DbOrder[];
  contacts: DbContact[];
  reviews: DbReview[];
  addresses: DbAddress[];
  newsletter: DbSubscriber[];
  carts: Record<string, CartItem[]>;
  wishlists: Record<string, string[]>;
};

// ---------- Paths & seed ----------

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "db.json");

function seedReviews(): DbReview[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const R = (
    productSlug: string,
    userName: string,
    rating: number,
    title: string,
    comment: string,
    daysAgo: number,
  ): DbReview => ({
    id: `R-${productSlug.slice(0, 4).toUpperCase()}-${userName.length}${rating}${daysAgo}`,
    productSlug,
    userId: `seed-${userName.toLowerCase().replace(/\s+/g, "-")}`,
    userName,
    rating,
    title,
    comment,
    createdAt: new Date(now - daysAgo * day).toISOString(),
  });
  return [
    R("premium-almonds", "Priya Sharma", 5, "Best almonds I've had", "Large, crunchy and fresh kernels. I soak them overnight for the kids — everyone loves them.", 2),
    R("premium-almonds", "Rahul Verma", 4, "Good quality", "Great quality and sealed packing. Slightly premium price, but worth it.", 9),
    R("premium-almonds", "Sneha Patel", 5, "Fresh and crunchy", "Bought these for Diwali gifting and everyone praised them. Will order again.", 15),
    R("jumbo-cashews", "Amit Kumar", 5, "Truly jumbo!", "Really large kernels with a creamy taste. Made kaju katli at home — tasted just like the sweet shop.", 4),
    R("jumbo-cashews", "Kavita Singh", 5, "Highly recommended", "Used them in gravies and sweets. Not a single broken kernel in the pack.", 12),
    R("california-pistachios", "Vikram Mehta", 4, "Tasty evening snack", "Roasting is perfect and the salt is balanced. Cracking the shells takes time — but that's normal with pistachios.", 6),
    R("arabian-dates", "Fatima Khan", 5, "Perfect for Ramzan", "Soft, juicy dates. We had them every day for iftar — very fresh packing.", 3),
    R("arabian-dates", "Suresh Gupta", 4, "Sweet and juicy", "Tastes almost like caramel. One pack got over very quickly!", 11),
    R("premium-anjeer", "Meera Iyer", 5, "Soft and honeyed", "The figs are really soft. I boil them in milk — top-class quality.", 7),
    R("mixed-dry-fruit-combo", "Rohan Joshi", 4, "Value for money", "Bought it for my gym diet, the mix is well balanced. The resealable pack is a useful feature.", 5),
    R("premium-gift-box", "Anjali Desai", 5, "Gifted it at a wedding", "The box is so beautiful we didn't feel like opening it! Fresh, premium dry fruits. Will order for corporate gifting too.", 8),
    R("golden-raisins", "Kiran Rao", 4, "Kitchen staple", "Added them to kheer and the taste improved a lot. Clean grains with a perfect sweet-tangy flavour.", 10),
  ];
}

function seed(): DbShape {
  const { salt, hash } = adminCreds();
  return {
    users: [
      {
        id: "U-ADMIN",
        name: "Store Admin",
        email: ADMIN_EMAIL,
        passHash: hash,
        salt,
        isAdmin: true,
        createdAt: new Date().toISOString(),
      },
    ],
    sessions: [],
    products: seedProducts,
    categories: categories.map((c) => ({ ...c })),
    coupons: [
      {
        code: "WELCOME10",
        pct: 10,
        min: 499,
        label: "10% off on orders above ₹499",
        active: true,
      },
      {
        code: "DRYFRUIT20",
        pct: 20,
        min: 1499,
        label: "20% off on orders above ₹1,499",
        active: true,
      },
    ],
    orders: [],
    contacts: [],
    reviews: seedReviews(),
    addresses: [],
    newsletter: [],
    carts: {},
    wishlists: {},
  };
}

function normalize(db: Partial<DbShape>): DbShape {
  const s = seed();
  // Users: purane records me isAdmin flag ensure karo.
  const users = (db.users ?? s.users).map((u) => ({
    ...u,
    isAdmin: !!u.isAdmin || u.email.toLowerCase() === ADMIN_EMAIL,
  }));
  // Admin user hamesha exist kare (purane DB me bhi).
  // Seed admin (U-ADMIN) ka password env se sync hota hai — env hi source of truth hai.
  const seedAdmin = s.users[0];
  const existingAdmin = users.find((u) => u.id === "U-ADMIN");
  if (existingAdmin) {
    existingAdmin.email = seedAdmin.email;
    existingAdmin.passHash = seedAdmin.passHash;
    existingAdmin.salt = seedAdmin.salt;
    existingAdmin.isAdmin = true;
  } else if (!users.some((u) => u.email.toLowerCase() === ADMIN_EMAIL)) {
    users.unshift(seedAdmin);
  }
  // Products: admin edits persist rahen — sirf khaali DB me seed karo.
  // Naye seed products (code me add hue) merge kar do taaki wo bhi dikhein.
  const existing = db.products?.length ? db.products : s.products;
  const seenSlugs = new Set(existing.map((p) => p.slug));
  const products = [...existing, ...s.products.filter((p) => !seenSlugs.has(p.slug))];
  // Seed reviews refresh hote rahen (taaki purani Hinglish seed reviews
  // English wali se replace ho jayein); real user reviews untouched rehte hain.
  const userReviews = (db.reviews ?? []).filter((r) => !r.userId.startsWith("seed-"));
  const seen = new Set(userReviews.map((r) => r.id));
  const reviews = [...userReviews, ...s.reviews.filter((r) => !seen.has(r.id))];
  return {
    users,
    sessions: db.sessions ?? s.sessions,
    products,
    // Categories: admin edits persist rahen, naye seed merge hote rahen.
    categories: (() => {
      const existing = db.categories?.length ? db.categories : s.categories;
      const seen = new Set(existing.map((c) => c.slug));
      return [...existing, ...s.categories.filter((c) => !seen.has(c.slug))];
    })(),
    coupons: db.coupons ?? s.coupons,
    orders: db.orders ?? [],
    contacts: db.contacts ?? [],
    reviews,
    addresses: db.addresses ?? [],
    newsletter: db.newsletter ?? [],
    carts: db.carts ?? {},
    wishlists: db.wishlists ?? {},
  };
}

// ---------- Read / Write ----------

export async function readDb(): Promise<DbShape> {
  try {
    const raw = await fs.readFile(DB_PATH, "utf-8");
    return normalize(JSON.parse(raw));
  } catch {
    const db = seed();
    await writeDb(db);
    return db;
  }
}

export async function writeDb(db: DbShape): Promise<void> {
  await fs.mkdir(DB_DIR, { recursive: true });
  // Atomic-ish write: tmp file phir rename
  const tmp = DB_PATH + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(db, null, 2), "utf-8");
  await fs.rename(tmp, DB_PATH);
}

export async function updateDb<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
  const db = await readDb();
  const out = await fn(db);
  await writeDb(db);
  return out;
}

// ---------- Product helpers (DB se) ----------

export async function getProducts() {
  const db = await readDb();
  return db.products;
}

export async function getProductBySlug(slug: string) {
  const db = await readDb();
  return db.products.find((p) => p.slug === slug) ?? null;
}

export async function getCategories() {
  const db = await readDb();
  return db.categories;
}

// ---------- Pricing helpers (server-side authoritative totals) ----------

export const SHIPPING_FREE_ABOVE = 999;
export const shippingFor = (net: number) =>
  net === 0 || net >= SHIPPING_FREE_ABOVE ? 0 : 79;
