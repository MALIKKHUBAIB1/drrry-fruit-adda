import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getProduct, products } from "@/lib/products";
import { SITE_NAME, absUrl } from "@/lib/seo";
import { ProductDetails } from "./ProductDetails";

export function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return { title: "Product | Dryfruit Adda" };
  const url = `/product/${p.slug}`;
  const price = p.variants[0]?.price;
  const title = p.metaTitle || `${p.name} — Buy Online`;
  const description =
    p.metaDescription ||
    `${p.description} Rated ${p.rating}/5 (${p.reviews} reviews).${price ? ` Starting at ₹${price.toLocaleString("en-IN")}.` : ""} Free shipping over ₹999 across India.`;
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
      images: [{ url: p.image, width: 800, height: 800, alt: p.name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${p.name} | ${SITE_NAME}`,
      description,
      images: [p.image],
    },
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();

  const offers = p.variants.map((v) => ({
    "@type": "Offer",
    name: `${p.name} — ${v.label}`,
    price: v.price,
    priceCurrency: "INR",
    availability: p.inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    url: absUrl(`/product/${p.slug}`),
  }));

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.image.startsWith("http") ? p.image : absUrl(p.image),
    sku: p.slug,
    category: p.category,
    brand: { "@type": "Brand", name: SITE_NAME },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: p.rating,
      reviewCount: p.reviews,
    },
    offers,
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
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <ProductDetails p={p} />
    </>
  );
}
