import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, X } from "lucide-react";
import { getAllPosts, urlFor } from "@/lib/server/sanity";
import { SITE_NAME, absUrl } from "@/lib/seo";
import BlogSidebar from "@/components/site/BlogSidebar";

export const metadata: Metadata = {
  title: "Blog | Dryfruit Adda",
  description:
    "Guides, health tips and gifting ideas from the world of premium dry fruits — by the Dryfruit Adda team.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Blog | Dryfruit Adda",
    description: "Guides, health tips and gifting ideas from the world of premium dry fruits.",
    url: absUrl("/blog"),
    siteName: SITE_NAME,
    type: "website",
  },
};

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default async function BlogPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string }>;
}) {
  const { tag } = await searchParams;
  const activeTag = tag?.trim() || undefined;
  const all = await getAllPosts();
  const posts = activeTag
    ? all.filter((p) => p.tags?.some((t) => t.toLowerCase() === activeTag.toLowerCase()))
    : all;

  const [featured, ...rest] = posts;

  return (
    <div className="bg-[#F6F1E7]">
      <div className="mx-auto max-w-6xl px-4 py-14 sm:py-20">
        <header className="max-w-2xl">
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-foreground/60">Journal</p>
          <h1 className="mt-3 font-display text-5xl font-medium leading-[1.05] text-primary sm:text-6xl">
            The Dry Fruit Journal
          </h1>
          <p className="mt-4 text-foreground/70">
            Guides, health tips and gifting ideas from the world of premium dry fruits.
          </p>
        </header>

        {activeTag ? (
          <div className="mt-8 inline-flex items-center gap-3 border border-primary/30 bg-background px-4 py-2 text-sm">
            <span className="text-foreground/60">
              Showing posts tagged <strong className="font-medium text-primary">{activeTag}</strong>
            </span>
            <Link href="/blog" className="inline-flex items-center gap-1 text-primary hover:underline">
              Clear <X className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : null}

        <div className="mt-10 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {posts.length === 0 ? (
              <div className="border border-foreground/15 bg-background/60 px-6 py-16 text-center">
                <h2 className="font-display text-3xl text-primary">
                  {activeTag ? "No posts in this category" : "Stories are on their way"}
                </h2>
                <p className="mx-auto mt-3 max-w-md text-foreground/60">
                  {activeTag
                    ? "Try another category, or browse everything we have written."
                    : "We are cooking up guides on dry fruits, health and gifting. Check back soon."}
                </p>
                <Link
                  href={activeTag ? "/blog" : "/shop"}
                  className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-medium text-background transition hover:opacity-90"
                >
                  {activeTag ? "All posts" : "Browse the collection"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            ) : (
              <>
                <Link
                  href={`/blog/${featured.slug}`}
                  className="group block overflow-hidden border border-foreground/15 bg-background transition hover:border-primary/40 hover:shadow-lg"
                >
                  <div className="relative aspect-[16/9] overflow-hidden bg-cocoa/10">
                    {featured.mainImage ? (
                      <img
                        src={urlFor(featured.mainImage).width(1200).height(675).url()}
                        alt={featured.title}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center font-display text-5xl text-primary/30">
                        {SITE_NAME}
                      </div>
                    )}
                    <span className="absolute left-4 top-4 bg-primary px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-background">
                      Featured
                    </span>
                  </div>
                  <div className="p-6 sm:p-7">
                    <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-foreground/50">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5" />
                        {formatDate(featured.publishedAt)}
                      </span>
                      {featured.tags?.map((t) => (
                        <span key={t} className="text-primary/70">
                          {t}
                        </span>
                      ))}
                    </div>
                    <h2 className="mt-3 font-display text-3xl font-medium leading-tight text-primary transition group-hover:text-primary/80 sm:text-4xl">
                      {featured.title}
                    </h2>
                    <p className="mt-3 leading-7 text-foreground/70">{featured.excerpt}</p>
                    <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                      Read more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                    </span>
                  </div>
                </Link>

                {rest.length > 0 ? (
                  <div className="mt-8 grid gap-6 sm:grid-cols-2">
                    {rest.map((post) => (
                      <Link
                        key={post._id}
                        href={`/blog/${post.slug}`}
                        className="group flex flex-col overflow-hidden border border-foreground/15 bg-background transition hover:border-primary/40 hover:shadow-lg"
                      >
                        <div className="relative aspect-[4/3] overflow-hidden bg-cocoa/10">
                          {post.mainImage ? (
                            <img
                              src={urlFor(post.mainImage).width(800).height(600).url()}
                              alt={post.title}
                              loading="lazy"
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center font-display text-4xl text-primary/30">
                              {SITE_NAME}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-[0.2em] text-foreground/50">
                            <span className="inline-flex items-center gap-1.5">
                              <CalendarDays className="h-3.5 w-3.5" />
                              {formatDate(post.publishedAt)}
                            </span>
                            {post.tags?.slice(0, 2).map((t) => (
                              <span key={t} className="text-primary/70">
                                {t}
                              </span>
                            ))}
                          </div>
                          <h2 className="mt-3 font-display text-2xl font-medium leading-tight text-primary transition group-hover:text-primary/80">
                            {post.title}
                          </h2>
                          <p className="mt-2 flex-1 text-sm leading-6 text-foreground/65 line-clamp-3">
                            {post.excerpt}
                          </p>
                          <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary">
                            Read more <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </div>

          <BlogSidebar posts={all} activeTag={activeTag} />
        </div>
      </div>
    </div>
  );
}
