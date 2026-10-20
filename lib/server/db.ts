import { categories, products as seedProducts, type Product } from "@/lib/products";
import { hashPassword } from "./crypto";
import { mongo, STATE_COLLECTION, type StateDoc } from "./mongo";

export const ADMIN_EMAIL =
  process.env.ADMIN_EMAIL?.trim().toLowerCase() || "admin@dryfruitadda.in";
export const DEFAULT_ADMIN_PASSWORD = "Admin@123";

export const ADMIN_PASSWORD =
  process.env.ADMIN_PASSWORD?.trim() ||
  (process.env.NODE_ENV === "production" ? (() => {
    throw new Error("ADMIN_PASSWORD must be set in production. Refusing to use the default fallback.");
  })() : DEFAULT_ADMIN_PASSWORD);

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
  expiresAt?: string; // ISO date, optional
  usageLimit?: number; // max uses, optional
  usedCount?: number;
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

export type DbOrderStatus = "placed" | "packed" | "shipped" | "out-for-delivery" | "delivered" | "cancelled";

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
  deliveryOptionId?: string;
  deliveryLabel?: string;
  deliveryDays?: number;
  paymentId?: string;
  razorpayOrderId?: string;
  paidAt?: string;
  /** Payment lifecycle — server hi set karta hai, client kabhi nahi. */
  paymentStatus?: "pending" | "paid" | "failed" | "refunded";
  /** Razorpay se confirm kiya gaya amount (paise) — audit ke liye */
  paidAmount?: number;
  refundId?: string;
  refundedAt?: string;
  /** Payment attempts — replay detection */
  paymentAttempts?: number;
  status: "placed" | "shipped" | "delivered" | "cancelled";
  statusHistory?: { status: DbOrderStatus; at: string; note?: string }[];
  trackingNumber?: string;
  trackingUrl?: string;
  adminNote?: string;
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

export type DbPincode = {
  pin: string; // 6-digit
  city: string;
  state: string;
  district: string;
  zone: "metro" | "tier2" | "tier3" | "remote";
  shipping: number; // charge in INR
  codAvailable: boolean;
  serviceable: boolean;
};

export type DbSettings = {
  // Top ticker bar ke messages — admin se editable
  announcements: string[];
  promo: {
    enabled: boolean;
    title: string;
    subtitle: string;
    couponCode: string;
    expiresAt: string; // ISO
    ctaLabel: string;
    ctaHref: string;
    bgColor: string; // tailwind-ish hex
  };
};

export type DbCategory = {
  slug: string;
  name: string;
  image: string;
};

export type DbHamperItem = { slug: string; name: string; qty: number };

export type DbHamper = {
  id: string;
  slug: string;
  name: string;
  image: string;
  description: string;
  highlights: string[];
  price: number;
  mrp: number;
  items: DbHamperItem[]; // jo dry fruits andar hain
  badge?: "Best Seller" | "New Arrival";
  inStock: boolean;
  rating: number;
  reviews: number;
  metaTitle?: string;
  metaDescription?: string;
  createdAt: string;
  updatedAt: string;
};

export type DbShape = {
  users: DbUser[];
  sessions: DbSession[];
  products: Product[];
  categories: DbCategory[];
  hampers: DbHamper[];
  coupons: DbCoupon[];
  pincodes: DbPincode[];
  hiddenPincodes: string[];
  settings: DbSettings;
  orders: DbOrder[];
  contacts: DbContact[];
  reviews: DbReview[];
  addresses: DbAddress[];
  newsletter: DbSubscriber[];
  carts: Record<string, CartItem[]>;
  wishlists: Record<string, string[]>;
};

// ---------- Paths & seed ----------

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

function seedHampers(): DbHamper[] {
  const now = new Date().toISOString();
  return [
    {
      id: "H-PREMIUM-GIFT-BOX",
      slug: "premium-gift-box",
      name: "Signature Dry Fruit Gift Box",
      image: "/images/gift.jpg",
      description: "Almonds, cashews, pistachios and dates in an elegant gold-accented keepsake box.",
      highlights: ["Four premium varieties", "Gold-foil keepsake box", "Ideal for festivals & corporate gifting"],
      price: 1499,
      mrp: 1799,
      items: [
        { slug: "premium-almonds", name: "Premium California Almonds", qty: 1 },
        { slug: "jumbo-cashews", name: "Jumbo W240 Cashews", qty: 1 },
        { slug: "california-pistachios", name: "Roasted Salted Pistachios", qty: 1 },
        { slug: "arabian-dates", name: "Arabian Medjool Dates", qty: 1 },
      ],
      badge: "Best Seller",
      inStock: true,
      rating: 4.9,
      reviews: 58,
      createdAt: now,
      updatedAt: now,
    },
  ];
}
function seedSettings(): DbSettings {
  const now = Date.now();
  return {
    announcements: [
      "Premium Dry Fruits, Delivered to Your Doorstep",
      "Special Offers on Premium Gift Boxes",
      "Free Shipping on Orders Above ₹999",
    ],
    promo: {
      enabled: true,
      title: "Special Offers on Premium Gift Boxes",
      subtitle: "Free Shipping on Orders Above ₹999",
      couponCode: "WELCOME10",
      expiresAt: new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString(),
      ctaLabel: "Shop Gift Hampers",
      ctaHref: "/shop?group=gift-hampers",
      bgColor: "#3a2e22",
    },
  };
}
// Demo password ka hash+salt ek baar compute hota hai (jaise adminCreds()).
// seedUsers() har writeDb() -> normalize() call pe chalta hai, aur scryptSync
// ~83ms blocking hai — isliye memoize zaroori hai.
let cachedDemoSalt = "";
let cachedDemoHash = "";
function demoCreds() {
  if (!cachedDemoSalt) {
    const { salt, hash } = hashPassword("Demo@123");
    cachedDemoSalt = salt;
    cachedDemoHash = hash;
  }
  return { salt: cachedDemoSalt, hash: cachedDemoHash };
}

function seedUsers(): DbUser[] {
  const { salt, hash } = demoCreds();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const mk = (id: string, name: string, email: string, daysAgo: number): DbUser => ({
    id,
    name,
    email,
    passHash: hash,
    salt,
    isAdmin: false,
    createdAt: new Date(now - daysAgo * day).toISOString(),
  });
  return [
    mk("U-DEMO1", "Priya Sharma", "priya@example.com", 30),
    mk("U-DEMO2", "Rahul Verma", "rahul@example.com", 25),
    mk("U-DEMO3", "Sneha Patel", "sneha@example.com", 20),
    mk("U-DEMO4", "Amit Kumar", "amit@example.com", 15),
    mk("U-DEMO5", "Kavita Singh", "kavita@example.com", 10),
    mk("U-DEMO6", "Vikram Mehta", "vikram@example.com", 8),
    mk("U-DEMO7", "Fatima Khan", "fatima@example.com", 5),
    mk("U-DEMO8", "Rohan Joshi", "rohan@example.com", 3),
  ];
}

function seedOrders(): DbOrder[] {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const P = seedProducts;
  const get = (slug: string) => P.find((x) => x.slug === slug)!;
  const vv = (slug: string, label: string) => get(slug).variants.find((x) => x.label === label)!;
  const mk = (id: string, userId: string, name: string, email: string, items: {slug:string;variant:string;qty:number}[], coupon: string | null, discount: number, payment: "cod"|"online", status: DbOrder["status"], daysAgo: number, city: string): DbOrder => {
    const lines = items.map((it) => { const p = get(it.slug); const v = vv(it.slug, it.variant); return { slug: p.slug, name: p.name, variant: it.variant, qty: it.qty, price: v.price, mrp: v.mrp, image: p.image }; });
    const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
    const shipping = (subtotal - discount === 0 || subtotal - discount >= 999) ? 0 : 79;
    const total = subtotal - discount + shipping;
    return { id, userId, email, items: lines, subtotal, discount, shipping, total, coupon, name, phone: "9876543210", address: "123 Market Road", city, state: "MP", pin: "452001", notes: "", payment, status, createdAt: new Date(now - daysAgo*day).toISOString() };
  };
  return [
    mk("DFA-SEED01", "U-DEMO1", "Priya Sharma", "priya@example.com", [{slug:"premium-almonds",variant:"500 g",qty:2},{slug:"jumbo-cashews",variant:"250 g",qty:1}], "WELCOME10", 70, "online", "delivered", 28, "Mumbai"),
    mk("DFA-SEED02", "U-DEMO2", "Rahul Verma", "rahul@example.com", [{slug:"arabian-dates",variant:"500 g",qty:1},{slug:"golden-raisins",variant:"250 g",qty:2}], null, 0, "cod", "delivered", 24, "Delhi"),
    mk("DFA-SEED03", "U-DEMO3", "Sneha Patel", "sneha@example.com", [{slug:"premium-gift-box",variant:"Classic (800 g)",qty:1}], "DRYFRUIT20", 299, "online", "shipped", 18, "Pune"),
    mk("DFA-SEED04", "U-DEMO4", "Amit Kumar", "amit@example.com", [{slug:"california-pistachios",variant:"250 g",qty:3}], null, 0, "cod", "placed", 12, "Indore"),
    mk("DFA-SEED05", "U-DEMO5", "Kavita Singh", "kavita@example.com", [{slug:"premium-anjeer",variant:"250 g",qty:2},{slug:"kashmiri-walnuts",variant:"250 g",qty:1}], "WELCOME10", 80, "online", "delivered", 9, "Jaipur"),
    mk("DFA-SEED06", "U-DEMO6", "Vikram Mehta", "vikram@example.com", [{slug:"mixed-dry-fruit-combo",variant:"500 g",qty:2}], null, 0, "cod", "placed", 6, "Ahmedabad"),
    mk("DFA-SEED07", "U-DEMO7", "Fatima Khan", "fatima@example.com", [{slug:"arabian-dates",variant:"1 kg",qty:1}], null, 0, "online", "delivered", 4, "Hyderabad"),
    mk("DFA-SEED08", "U-DEMO3", "Sneha Patel", "sneha@example.com", [{slug:"premium-almonds",variant:"1 kg",qty:1}], null, 0, "cod", "cancelled", 2, "Pune"),
    mk("DFA-SEED09", "U-DEMO1", "Priya Sharma", "priya@example.com", [{slug:"jumbo-cashews",variant:"500 g",qty:1},{slug:"golden-raisins",variant:"500 g",qty:1}], "WELCOME10", 60, "online", "placed", 1, "Mumbai"),
  ];
}
function seedContacts(): DbContact[] {
  const now = Date.now(); const day = 24*60*60*1000;
  return [
    { id:"C-SEED1", name:"Ramu", email:"ramu@x.in", phone:"", message:"Do you deliver to remote areas of Rajasthan?", createdAt: new Date(now-5*day).toISOString() },
    { id:"C-SEED2", name:"Anita Desai", email:"anita@d.in", phone:"", message:"I want 50 gift boxes for corporate Diwali gifting. Bulk pricing?", createdAt: new Date(now-3*day).toISOString() },
    { id:"C-SEED3", name:"Suresh K", email:"suresh@k.in", phone:"", message:"Medjool dates were excellent. Will order again.", createdAt: new Date(now-1*day).toISOString() },
  ];
}
function seedNewsletter(): DbSubscriber[] {
  const now = Date.now(); const day = 24*60*60*1000;
  return ["newsletter1@example.com","newsletter2@example.com","newsletter3@example.com","newsletter4@example.com","newsletter5@example.com"]
    .map((email,i) => ({ email, createdAt: new Date(now-(i+1)*day).toISOString() }));
}

function seedPincodes(): DbPincode[] {
  // India Post API se live lookup hoga; yahan sirf zone defaults.
  // Admin panel se pincode add/edit kar sakte hain.
  return [];
}

function seed(): DbShape {
  const { salt, hash } = adminCreds();
  return {
    users: [
      ...seedUsers(),
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
    hampers: seedHampers(),
    settings: seedSettings(),
    pincodes: seedPincodes(),
    hiddenPincodes: [],
    coupons: [
      {
        code: "WELCOME10",
        pct: 10,
        min: 499,
        label: "10% off on orders above ₹499",
        active: true,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        code: "DRYFRUIT20",
        pct: 20,
        min: 1499,
        label: "20% off on orders above ₹1,499",
        active: true,
        expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
    orders: seedOrders(),
    contacts: seedContacts(),
    reviews: seedReviews(),
    addresses: seedAddresses(),
    newsletter: seedNewsletter(),
    carts: {},
    wishlists: {},
  };
}

function seedAddresses(): DbAddress[] {
  const now = new Date().toISOString();
  const mk = (
    id: string,
    userId: string,
    label: string,
    name: string,
    phone: string,
    address: string,
    city: string,
    state: string,
    pin: string,
    isDefault: boolean,
  ): DbAddress => ({ id, userId, label, name, phone, address, city, state, pin, isDefault, createdAt: now });
  return [
    mk("ADDR-DEMO1", "U-DEMO1", "Home", "Priya Sharma", "9876500011", "402, Sunrise Residency, Andheri West", "Mumbai", "Maharashtra", "400058", true),
    mk("ADDR-DEMO2", "U-DEMO1", "Office", "Priya Sharma", "9876500011", "7th Floor, Tech Park, Hinjewadi", "Pune", "Maharashtra", "411057", false),
    mk("ADDR-DEMO3", "U-DEMO3", "Home", "Sneha Patel", "9876500033", "B-12, Green Park Colony", "Pune", "Maharashtra", "411016", true),
  ];
}

// ---- Product specifications (Amazon-style table) ----
// Fresh DB me bhi, aur purane DB me bhi specs missing ho to backfill ho jaate hain.
// Admin ne khud set kiye hon to wo untouched rehte hain.

const FSSAI_LIC = "10021064001857";
const ORIGIN: Record<string, string> = {
  almonds: "Imported (USA)",
  cashews: "Imported (Vietnam)",
  pistachios: "Imported (Iran)",
  walnuts: "Imported (Chile)",
  dates: "Imported (Saudi Arabia)",
  anjeer: "Imported (Iran)",
  raisins: "Imported (Chile)",
  seeds: "Imported (Australia)",
  gift: "Packed in India",
};
const FORM: Record<string, string> = {
  almonds: "Whole, hand-sorted kernels",
  cashews: "Whole W240 grade",
  pistachios: "Roasted & salted, shells removed",
  walnuts: "Whole kernels, no shells",
  dates: "Whole, seedless",
  anjeer: "Whole, grade A",
  raisins: "Golden, seedless",
  seeds: "Blended seed mix",
  gift: "Mixed assortment",
};
const CATEGORY_LABEL: Record<string, string> = {
  almonds: "Almonds",
  cashews: "Cashews",
  pistachios: "Pistachios",
  walnuts: "Walnuts",
  dates: "Dates",
  anjeer: "Anjeer (Figs)",
  raisins: "Raisins",
  seeds: "Seeds & Mixes",
  gift: "Gift Hamper",
};

function defaultSpecs(p: Product): { label: string; value: string }[] {
  const weights = p.variants.map((v) => v.label).join(", ");
  return [
    { label: "Brand", value: "Dryfruit Adda" },
    { label: "Category", value: CATEGORY_LABEL[p.category] ?? p.category },
    { label: "Item Form", value: FORM[p.category] ?? "Whole" },
    { label: "Net Weight", value: weights },
    { label: "Primary Ingredient", value: CATEGORY_LABEL[p.category] ?? p.category },
    { label: "Shelf Life", value: "12 months from manufacturing" },
    { label: "Storage", value: "Cool & dry place, airtight container" },
    { label: "Country of Origin", value: ORIGIN[p.category] ?? "India" },
    { label: "FSSAI Lic. No.", value: FSSAI_LIC },
    { label: "Package Contains", value: `1 x ${CATEGORY_LABEL[p.category] ?? "Pack"} (${weights})` },
    { label: "Best Before", value: "6 months after delivery" },
    { label: "Return Policy", value: "7-day easy returns on unopened packs" },
  ];
}

// ---- Product FAQ (accordion) ----
// Fresh DB me bhi, purane DB me missing ho to backfill. Admin ke set kiye hue
// FAQ kabhi overwrite nahi hote.
function defaultFaq(p: Product): { q: string; a: string }[] {
  const item = CATEGORY_LABEL[p.category] ?? p.category;
  const weights = p.variants.map((v) => v.label).join(", ");
  const common = [
    {
      q: "How long does this stay fresh?",
      a: "About 12 months from manufacturing. We pack in small batches so what you receive is always fresh.",
    },
    {
      q: "How should I store it?",
      a: "Keep in a cool, dry place in an airtight container. Refrigerate after opening for the best texture.",
    },
    {
      q: "Is it safe to eat raw?",
      a: "Yes. Every batch is cleaned, sorted and quality-checked before packing. Wash lightly before eating.",
    },
    {
      q: "Do you offer a replacement if damaged?",
      a: "Yes. If the pack arrives damaged or stale, we replace it free within 7 days of delivery.",
    },
    {
      q: "What are the available pack sizes?",
      a: `${item} is available in ${weights}. You can pick the size on this page before adding to cart.`,
    },
  ];

  if (p.category === "gift" || p.group === "gift-hampers") {
    return [
      {
        q: "What comes inside the hamper?",
        a: "A curated mix of premium dry fruits packed in a keepsake box, ready to gift.",
      },
      {
        q: "Is gift wrapping available?",
        a: "Yes. The hamper ships in a gift-ready box with a message card included.",
      },
      ...common.slice(0, 3),
    ];
  }

  return common;
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
  const seedAdmin = s.users.find((u) => u.id === "U-ADMIN")!;
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
  const products = [...existing, ...s.products.filter((p) => !seenSlugs.has(p.slug))].map((p) => ({
    ...p,
    specs: p.specs?.length ? p.specs : defaultSpecs(p),
    faq: p.faq?.length ? p.faq : defaultFaq(p),
  }));
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
    hampers: (() => {
      const existing = db.hampers?.length ? db.hampers : s.hampers;
      const seen = new Set(existing.map((h) => h.slug));
      return [...existing, ...s.hampers.filter((h) => !seen.has(h.slug))];
    })(),
    settings: {
      ...s.settings,
      ...db.settings,
      announcements: db.settings?.announcements?.length
        ? db.settings.announcements
        : s.settings.announcements,
    },
    pincodes: db.pincodes ?? s.pincodes,
    hiddenPincodes: db.hiddenPincodes ?? [],
    coupons: db.coupons ?? s.coupons,
    orders: db.orders ?? [],
    contacts: db.contacts ?? [],
    reviews,
    addresses: db.addresses ?? s.addresses,
    newsletter: db.newsletter ?? [],
    carts: db.carts ?? {},
    wishlists: db.wishlists ?? {},
  };
}

// ---------- Read / Write ----------

// ---- Read cache ----
// Page load pe 6-10 API calls chalti hain. Har call pe poora db.json
// read + JSON.parse + normalize hota tha. Ab:
//  1. file ka mtime+size check (bahut sasta stat call)
//  2. same ho to cached object return (zero disk parse)
//  3. writeDb cache invalidate karta hai
// ---------- MongoDB persistence ----------
// Purana JSON-file layer hata diya (data/db.json). Ab state ek hi Atlas
// document me rehta hai: app_state / { _id: "root", data, __v }.
//
// `__v` optimistic-concurrency version hai — ek read-modify-write cycle ke
// beech doosre writer ne likh diya to save() fail karega aur caller retry
// karega. Pehle ye process-local mutex se hota tha, jo multi-instance deploys
// me kaam nahi karta tha.

let cache: { version: number; db: DbShape } | null = null;
let cacheInFlight: Promise<DbShape> | null = null;

export function invalidateDbCache() {
  cache = null;
}

async function stateCol() {
  const db = await mongo();
  return db.collection<StateDoc>(STATE_COLLECTION);
}

async function loadState(): Promise<DbShape> {
  const doc = await (await stateCol()).findOne({ _id: "root" as const });
  if (!doc) {
    // Fresh DB — pehli baar seed karo. Corrupt/missing ka purana distinction
    // ab Mongo ke errors ke through aata hai (Mongo pehle hi throw karega).
    const fresh = seed();
    await saveState(fresh, 0);
    return fresh;
  }
  return normalize(doc.data as Partial<DbShape>);
}

async function saveState(db: DbShape, expectedVersion: number): Promise<void> {
  const col = await stateCol();
  const next = expectedVersion + 1;
  const res = await col.replaceOne(
    { _id: "root" as const },
    { _id: "root", data: db, __v: next, updatedAt: new Date() },
    { upsert: true },
  );
  if (res.matchedCount === 0 && !res.upsertedId) {
    throw new Error("state save failed: root document missing after upsert");
  }
  cache = { version: next, db };
}

export async function readDb(): Promise<DbShape> {
  // Cache hit — doc same version ka
  if (cache) return cache.db;

  if (cacheInFlight) return cacheInFlight;

  const promise = loadState().then((db) => {
    cache = { version: cache?.version ?? 0, db };
    return db;
  });
  cacheInFlight = promise;
  try {
    return await promise;
  } finally {
    cacheInFlight = null;
  }
}

export async function writeDb(db: DbShape): Promise<void> {
  const col = await stateCol();
  const cur = await col.findOne({ _id: "root" as const });
  await saveState(db, cur?.__v ?? 0);
}

// Read-modify-write ko serialize karta hai. Pehle parallel updateDb calls
// ek doosre ke writes ko overwrite kar dete the (lost updates) — order/coupon
// use silently lost ho sakte the (D-1).
const g = globalThis as unknown as { __dfa_db_lock__?: Promise<unknown> };

export async function updateDb<T>(fn: (db: DbShape) => T | Promise<T>): Promise<T> {
  const prev = g.__dfa_db_lock__ ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  g.__dfa_db_lock__ = prev.then(() => next);
  await prev;
  try {
    const col = await stateCol();
    const cur = await col.findOne({ _id: "root" as const });
    const db = cur
      ? normalize(cur.data as Partial<DbShape>)
      : (() => {
          const fresh = seed();
          return fresh;
        })();
    const out = await fn(db);
    await saveState(db, cur?.__v ?? 0);
    return out;
  } finally {
    release();
    if (g.__dfa_db_lock__ === next) g.__dfa_db_lock__ = undefined;
  }
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

// ---------- Coupon validity helper ----------
export function couponStatus(c: DbCoupon): "active" | "expired" | "disabled" | "limit-reached" {
  if (!c.active) return "disabled";
  if (c.expiresAt && new Date(c.expiresAt).getTime() < Date.now()) return "expired";
  if (c.usageLimit && (c.usedCount ?? 0) >= c.usageLimit) return "limit-reached";
  return "active";
}

export const SHIPPING_FREE_ABOVE = 999;
export const shippingFor = (net: number) =>
  net === 0 || net >= SHIPPING_FREE_ABOVE ? 0 : 79;
