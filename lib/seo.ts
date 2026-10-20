// Central SEO config — saare metadata/JSON-LD yahin se URL uthate hain.
export const SITE_NAME = "Dryfruit Adda";
export const SITE_TAGLINE = "Nature's Finest. Luxury in Every Bite.";
export const SITE_DESCRIPTION =
  "Shop handpicked premium almonds, cashews, pistachios, walnuts, dates, figs and luxury dry fruit gift hampers. Delivered across India.";

export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") || "https://dryfruitadda.in";

export const absUrl = (path: string) =>
  path.startsWith("http") ? path : `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

export const DEFAULT_OG_IMAGE = "https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/hero_PHRF6HPzu.jpg";

export const SITE_KEYWORDS = [
  "dry fruits",
  "premium dry fruits India",
  "buy almonds online",
  "cashews online",
  "pistachios",
  "walnuts",
  "medjool dates",
  "anjeer",
  "dry fruit gift hampers",
  "Diwali dry fruit gifts",
  "Dryfruit Adda",
];
