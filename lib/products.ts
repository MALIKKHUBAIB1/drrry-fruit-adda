export const FREE_SHIPPING_ABOVE = 999;

export type Variant = { label: string; price: number; mrp: number };

// Delivery option — har product me 1..3 options
export type DeliveryOption = {
  id: string;
  label: string;
  days: number; // 0 = same day
  surcharge: number; // extra charge on top of zone shipping
  enabled: boolean;
};

export const DEFAULT_DELIVERY_OPTIONS: DeliveryOption[] = [
  { id: "standard", label: "Standard Delivery", days: 5, surcharge: 0, enabled: true },
  { id: "express", label: "Express Delivery", days: 2, surcharge: 60, enabled: true },
  { id: "sameday", label: "Same-Day Delivery", days: 0, surcharge: 150, enabled: true },
];

export const etaLabel = (days: number) =>
  days <= 0 ? "Same day" : days === 1 ? "Next day" : `${days}–${days + 2} days`;

/** Product ki poori gallery (images + fallback on single image). */
export const galleryOf = (p?: { image: string; images?: string[] }): string[] => {
  if (!p) return [];
  const list = (p.images ?? []).filter(Boolean);
  const all = list.length ? list : [p.image];
  // primary image hamesha pehli rahe
  return all.includes(p.image) ? [p.image, ...all.filter((i) => i !== p.image)] : all;
};

/** Product ka enabled delivery options (missing ho to defaults). */
export const optionsOf = (p?: { deliveryOptions?: DeliveryOption[] }): DeliveryOption[] => {
  const own = p?.deliveryOptions?.filter((o) => o && o.enabled);
  return own && own.length ? own : DEFAULT_DELIVERY_OPTIONS;
};

export type Product = {
  slug: string;
  name: string;
  category: string;
  group: "dry-fruits" | "nuts-seeds" | "dates-figs" | "gift-hampers";
  image: string;
  images?: string[]; // gallery — pehli image primary hoti hai
  rating: number;
  reviews: number;
  badge?: "Best Seller" | "New Arrival";
  inStock: boolean;
  description: string;
  highlights: string[];
  /** Amazon-style specification table — admin se editable. Label/value pairs. */
  specs?: { label: string; value: string }[];
  /** FAQ accordion content — admin se editable. */
  faq?: { q: string; a: string }[];
  variants: Variant[];
  deliveryOptions?: DeliveryOption[];
  added: number;
  metaTitle?: string;
  metaDescription?: string;
};

const v = (base: number, mrp: number): Variant[] => [
  { label: "250 g", price: base, mrp },
  { label: "500 g", price: Math.round(base * 1.9), mrp: Math.round(mrp * 1.9) },
  { label: "1 kg", price: Math.round(base * 3.6), mrp: Math.round(mrp * 3.6) },
];

export const categories = [
  { slug: "almonds", name: "Almonds", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/almonds_UOTtyTDyL.jpg" },
  { slug: "cashews", name: "Cashews", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/cashews_qi5c9czgu.jpg" },
  { slug: "pistachios", name: "Pistachios", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/pistachios_H0HNVqxUN.jpg" },
  { slug: "walnuts", name: "Walnuts", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/walnuts_QUH9myGnB.jpg" },
  { slug: "dates", name: "Dates", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/dates_tpfc8hmvA.jpg" },
  { slug: "figs", name: "Figs", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/figs_umojO18FS.jpg" },
  { slug: "raisins", name: "Raisins", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/raisins_18_7uV1FC.jpg" },
  { slug: "mixed", name: "Mixed Dry Fruits", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/mixed_Cb6n5_mP1.jpg" },
  { slug: "seeds", name: "Seeds & Snacks", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/seeds_i6RFcfYr4.jpg" },
  { slug: "gift-hampers", name: "Gift Hampers", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/gift_JYpveUrx4.jpg" },
];

// Demo catalogue — replace with real data from your store backend later.
export const products: Product[] = [
  { slug: "premium-almonds", name: "Premium California Almonds", category: "almonds", group: "dry-fruits", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/almonds_UOTtyTDyL.jpg", rating: 4.8, reviews: 214, badge: "Best Seller", inStock: true, added: 3,
    description: "Crunchy, naturally sweet almonds, carefully selected for size and taste. Perfect for soaking, snacking or festive sweets.",
    highlights: ["Hand-sorted kernels", "Rich, buttery crunch", "Great soaked overnight"], variants: v(349, 420) },
  { slug: "jumbo-cashews", name: "Jumbo W240 Cashews", category: "cashews", group: "dry-fruits", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/cashews_qi5c9czgu.jpg", rating: 4.9, reviews: 188, badge: "Best Seller", inStock: true, added: 4,
    description: "Large, creamy whole cashews with a delicate sweetness. A favourite for gifting and rich curries.",
    highlights: ["Whole jumbo grade", "Creamy texture", "Ideal for gravies & sweets"], variants: v(399, 480) },
  { slug: "california-pistachios", name: "Roasted Salted Pistachios", category: "pistachios", group: "nuts-seeds", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/pistachios_H0HNVqxUN.jpg", rating: 4.7, reviews: 156, inStock: true, added: 6,
    description: "Lightly roasted and salted in-shell pistachios — the perfect evening snack.",
    highlights: ["Lightly salted", "Easy-open shells", "Roasted in small batches"], variants: v(459, 540) },
  { slug: "kashmiri-walnuts", name: "Kashmiri Walnut Kernels", category: "walnuts", group: "nuts-seeds", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/walnuts_QUH9myGnB.jpg", rating: 4.6, reviews: 97, badge: "New Arrival", inStock: true, added: 9,
    description: "Light-coloured walnut halves from Kashmir with a mild, earthy flavour.",
    highlights: ["Light halves", "Mild & fresh taste", "Great in baking"], variants: v(429, 499) },
  { slug: "premium-anjeer", name: "Premium Afghan Anjeer", category: "figs", group: "dates-figs", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/figs_umojO18FS.jpg", rating: 4.7, reviews: 76, inStock: true, added: 5,
    description: "Soft, chewy dried figs with natural honeyed sweetness.",
    highlights: ["Soft & chewy", "Naturally sweet", "Rich in fibre"], variants: v(499, 580) },
  { slug: "arabian-dates", name: "Arabian Medjool Dates", category: "dates", group: "dates-figs", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/dates_tpfc8hmvA.jpg", rating: 4.8, reviews: 132, badge: "Best Seller", inStock: true, added: 2,
    description: "Plump, glossy Medjool dates with a caramel-like taste.",
    highlights: ["Large & juicy", "Caramel sweetness", "Perfect for iftar & gifting"], variants: v(379, 450) },
  { slug: "golden-raisins", name: "Golden Raisins", category: "raisins", group: "dry-fruits", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/raisins_18_7uV1FC.jpg", rating: 4.5, reviews: 64, inStock: true, added: 1,
    description: "Bright, tangy-sweet golden raisins for snacking, kheer and baking.",
    highlights: ["Seedless", "Tangy-sweet", "Kitchen staple"], variants: v(189, 230) },
  { slug: "mixed-dry-fruit-combo", name: "Royal Mixed Dry Fruit Combo", category: "mixed", group: "dry-fruits", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/mixed_Cb6n5_mP1.jpg", rating: 4.7, reviews: 109, badge: "New Arrival", inStock: true, added: 10,
    description: "A balanced mix of almonds, cashews, pistachios, walnuts and raisins.",
    highlights: ["Five-fruit mix", "Everyday nutrition", "Resealable pack"], variants: v(399, 470) },
  { slug: "seed-mix", name: "Super Seeds Mix", category: "seeds", group: "nuts-seeds", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/seeds_i6RFcfYr4.jpg", rating: 4.4, reviews: 41, inStock: false, added: 7,
    description: "Pumpkin, sunflower, chia and flax seeds — sprinkle on smoothies and salads.",
    highlights: ["Four-seed blend", "Smoothie & salad topper", "Unsalted"], variants: v(249, 299) },
  { slug: "premium-gift-box", name: "Signature Dry Fruit Gift Box", category: "gift-hampers", group: "gift-hampers", image: "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/gift_JYpveUrx4.jpg", rating: 4.9, reviews: 58, badge: "Best Seller", inStock: true, added: 8,
    description: "Almonds, cashews, pistachios and dates in an elegant gold-accented keepsake box.",
    highlights: ["Four premium varieties", "Gold-foil keepsake box", "Ideal for festivals & corporate gifting"],
    variants: [{ label: "Classic (800 g)", price: 1499, mrp: 1799 }, { label: "Grand (1.2 kg)", price: 2199, mrp: 2599 }] },
];

export const groups: Record<string, string> = {
  "dry-fruits": "Dry Fruits",
  "nuts-seeds": "Nuts & Seeds",
  "dates-figs": "Dates & Figs",
  "gift-hampers": "Gift Hampers",
};

export const inr = (n: number) => "₹" + n.toLocaleString("en-IN");
export const getProduct = (slug: string) => products.find((p) => p.slug === slug);
