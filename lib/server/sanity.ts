import "server-only";
import { createImageUrlBuilder, type SanityImageSource } from "@sanity/image-url";
import { createClient } from "@sanity/client";
import type { PortableTextBlock } from "@portabletext/types";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID?.trim() || "inq7tvs6";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET?.trim() || "production";

const client = createClient({
  projectId,
  dataset,
  apiVersion: "2026-11-03",
  useCdn: true,
  perspective: "published",
});

const builder = createImageUrlBuilder({ projectId, dataset });

export const urlFor = (source: SanityImageSource) => builder.image(source);

export const ogImageFor = (source: SanityImageSource | undefined, fallback: string) =>
  source ? urlFor(source).width(1200).height(630).url() : fallback;

export type PostCard = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string;
  tags?: string[];
  mainImage?: SanityImageSource;
  author?: { name?: string; avatar?: SanityImageSource };
};

export type PostSeo = {
  metaTitle?: string;
  metaDescription?: string;
  ogImage?: SanityImageSource;
};

export type PostFaqItem = {
  question: string;
  answer: string;
};

export type PostDetail = PostCard & {
  body?: PortableTextBlock[];
  seo?: PostSeo;
  faq?: PostFaqItem[];
};

const cardProjection = `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  tags,
  mainImage,
  author{name, avatar}
}`;

const detailProjection = `{
  _id,
  title,
  "slug": slug.current,
  excerpt,
  publishedAt,
  tags,
  mainImage,
  author{name, avatar},
  body,
  seo{metaTitle, metaDescription, ogImage},
  faq[]{question, answer}
}`;

const ALL_POSTS_QUERY = `*[_type == "post"] | order(publishedAt desc) ${cardProjection}`;
const POST_BY_SLUG_QUERY = `*[_type == "post" && slug.current == $slug][0] ${detailProjection}`;
const POST_SLUGS_QUERY = `*[_type == "post" && defined(slug.current)]{ "slug": slug.current }`;

export async function getAllPosts(): Promise<PostCard[]> {
  try {
    return await client.fetch<PostCard[]>(ALL_POSTS_QUERY);
  } catch {
    return [];
  }
}

export async function getPostBySlug(slug: string): Promise<PostDetail | null> {
  try {
    return await client.fetch<PostDetail | null>(POST_BY_SLUG_QUERY, { slug });
  } catch {
    return null;
  }
}

export async function getAllPostSlugs(): Promise<string[]> {
  try {
    const rows = await client.fetch<{ slug: string }[]>(POST_SLUGS_QUERY);
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}
