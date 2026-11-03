import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, User } from "lucide-react";
import { getAllPostSlugs, getAllPosts, getPostBySlug, ogImageFor, urlFor } from "@/lib/server/sanity";
import { DEFAULT_OG_IMAGE, SITE_NAME, absUrl } from "@/lib/seo";
import PostBody from "@/components/site/PortableText";
import BlogSidebar from "@/components/site/BlogSidebar";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: `Blog | ${SITE_NAME}` };
  const url = `/blog/${post.slug}`;
  const metaTitle = post.seo?.metaTitle?.trim();
  const description = post.seo?.metaDescription?.trim() || post.excerpt;
  const image = ogImageFor(post.seo?.ogImage || post.mainImage, DEFAULT_OG_IMAGE);
  return {
    // absolute bypasses the root "%s | Dryfruit Adda" template so editors
    // control the full tag when an SEO title is set
    title: metaTitle ? { absolute: metaTitle } : post.title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: metaTitle || post.title,
      description,
      url: absUrl(url),
      siteName: SITE_NAME,
      type: "article",
      publishedTime: post.publishedAt,
      images: [{ url: image, width: 1200, height: 630, alt: post.title }],
    },
  };
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    image: ogImageFor(post.mainImage, DEFAULT_OG_IMAGE),
    mainEntityOfPage: absUrl(`/blog/${post.slug}`),
    publisher: { "@type": "Organization", name: SITE_NAME },
    ...(post.author?.name ? { author: { "@type": "Person", name: post.author.name } } : {}),
  };

  const faqJsonLd =
    post.faq && post.faq.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: post.faq.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: { "@type": "Answer", text: f.answer },
          })),
        }
      : null;

  const allPosts = await getAllPosts();
  const morePosts = allPosts.filter((p) => p.slug !== post.slug).slice(0, 3);

  return (
    <div className="bg-[#F6F1E7]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {faqJsonLd ? (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
          />
        ) : null}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_300px]">
          <article>
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm text-foreground/60 transition hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" /> All articles
            </Link>

            <header className="mt-8">
              <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-foreground/50">
                <span className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDate(post.publishedAt)}
                </span>
                {post.author?.name ? (
                  <span className="inline-flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {post.author.name}
                  </span>
                ) : null}
                {post.tags?.map((tag) => (
                  <span key={tag} className="text-primary/70">
                    {tag}
                  </span>
                ))}
              </div>
              <h1 className="mt-4 font-display text-4xl font-medium leading-[1.08] text-primary sm:text-5xl">
                {post.title}
              </h1>
              <p className="mt-4 text-lg leading-7 text-foreground/70">{post.excerpt}</p>
            </header>

            {post.mainImage ? (
              <div className="mt-8 overflow-hidden border border-foreground/10">
                <img
                  src={urlFor(post.mainImage).width(1400).url()}
                  alt={post.title}
                  className="aspect-[2/1] w-full object-cover"
                />
              </div>
            ) : null}

            {post.body?.length ? (
              <PostBody value={post.body} />
            ) : (
              <p className="mt-8 text-foreground/60">This post has no content yet.</p>
            )}

            {post.faq && post.faq.length > 0 ? (
              <section className="mt-14 border-t border-foreground/15 pt-10">
                <h2 className="font-display text-3xl font-medium text-primary">
                  Frequently Asked Questions
                </h2>
                <dl className="mt-6 space-y-5">
                  {post.faq.map((f) => (
                    <div key={f.question} className="border border-foreground/15 bg-background p-5">
                      <dt className="font-display text-lg font-medium leading-snug text-primary">
                        {f.question}
                      </dt>
                      <dd className="mt-2 text-sm leading-6 text-foreground/70">{f.answer}</dd>
                    </div>
                  ))}
                </dl>
              </section>
            ) : null}

            <footer className="mt-14 border-t border-foreground/15 pt-8">
              <Link
                href="/blog"
                className="inline-flex items-center gap-2 rounded-full border border-primary px-6 py-3 text-sm font-medium text-primary transition hover:bg-primary hover:text-background"
              >
                <ArrowLeft className="h-4 w-4" /> Back to all articles
              </Link>
            </footer>

            {morePosts.length > 0 ? (
              <section className="mt-16">
                <h2 className="font-display text-2xl text-primary">Keep reading</h2>
                <ul className="mt-4 space-y-3">
                  {morePosts.map((p) => (
                    <li key={p._id}>
                      <Link
                        href={`/blog/${p.slug}`}
                        className="block border border-foreground/15 bg-background px-5 py-4 text-foreground/80 transition hover:border-primary/40 hover:text-primary"
                      >
                        <span className="font-display text-lg text-primary">{p.title}</span>
                        <span className="mt-1 block text-sm text-foreground/60 line-clamp-1">
                          {p.excerpt}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </article>

          <BlogSidebar posts={allPosts} excludeSlug={post.slug} />
        </div>
      </div>
    </div>
  );
}
