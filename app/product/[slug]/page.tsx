import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readDb } from "@/lib/server/db";
import { SITE_NAME, absUrl } from "@/lib/seo";
import { ProductDetails } from "./ProductDetails";

// DB se padho — admin ke kiye changes (price, images, delivery options) yahi reflect honge.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const db = await readDb();
  const p = db.products.find((x) => x.slug === slug);
  if (!p) return { title: "Product | Dryfruit Adda" };
  const url = `/product/${p.slug}`;
  const price = p.variants[0]?.price;
  const title = p.metaTitle || `${p.name} — Buy Online`;
  const description =
    p.metaDescription ||
    `${p.description} Rated ${p.rating}/5 (${p.reviews} reviews).${
      price ? ` Starting at ₹${price.toLocaleString("en-IN")}.` : ""
    } Free shipping over ₹999 across India.`;
  return {
    title,
    description,
    keywords: [p.name, p.category, "buy dry fruits online", "premium dry fruits India", SITE_NAME],
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${p.name} | ${SITE_NAME}`,
      description,
      images: p.images?.length ? p.images.map((src) => ({ url: src })) : [{ url: p.image }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${p.name} | ${SITE_NAME}`,
      description,
      images: p.images?.length ? p.images : [p.image],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const db = await readDb();
  const p = db.products.find((x) => x.slug === slug);
  if (!p) notFound();

  const related = db.products
    .filter((x) => x.slug !== slug && (x.group === p.group || x.category === p.category))
    .slice(0, 4);

  const gallery = p.images?.length ? p.images : [p.image];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: gallery.map((src) => (src.startsWith("http") ? src : absUrl(src))),
    sku: p.slug,
    category: p.category,
    brand: { "@type": "Brand", name: SITE_NAME },
    aggregateRating: { "@type": "AggregateRating", ratingValue: p.rating, reviewCount: p.reviews },
    offers: p.variants.map((v) => ({
      "@type": "Offer",
      name: `${p.name} — ${v.label}`,
      price: v.price,
      priceCurrency: "INR",
      availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absUrl(`/product/${p.slug}`),
    })),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: absUrl("/") },
      { "@type": "ListItem", position: 2, name: "Shop", item: absUrl("/shop") },
      { "@type": "ListItem", position: 3, name: p.name, item: absUrl(`/product/${p.slug}`) },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ProductDetails p={p} related={related} />
    </>
  );
}