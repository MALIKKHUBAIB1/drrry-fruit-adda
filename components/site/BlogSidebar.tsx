import Link from "next/link";
import type { PostCard } from "@/lib/server/sanity";
import { urlFor } from "@/lib/server/sanity";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function BlogSidebar({
  posts,
  activeTag,
  excludeSlug,
}: {
  posts: PostCard[];
  activeTag?: string;
  excludeSlug?: string;
}) {
  const tagCounts: Record<string, number> = {};
  for (const p of posts) for (const t of p.tags ?? []) tagCounts[t] = (tagCounts[t] ?? 0) + 1;
  const tags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]);
  const recent = posts.filter((p) => p.slug !== excludeSlug).slice(0, 4);

  return (
    <aside className="space-y-6 lg:sticky lg:top-24 lg:h-fit">
      <div className="border border-foreground/15 bg-background p-6">
        <h2 className="font-display text-xl text-primary">Categories</h2>
        {tags.length === 0 ? (
          <p className="mt-3 text-sm text-foreground/60">No categories yet.</p>
        ) : (
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link
                href="/blog"
                className={!activeTag ? "font-medium text-primary" : "text-foreground/70 transition hover:text-primary"}
              >
                All posts <span className="text-foreground/40">({posts.length})</span>
              </Link>
            </li>
            {tags.map(([t, c]) => {
              const active = activeTag?.toLowerCase() === t.toLowerCase();
              return (
                <li key={t}>
                  <Link
                    href={`/blog?tag=${encodeURIComponent(t)}`}
                    className={active ? "font-medium text-primary" : "text-foreground/70 transition hover:text-primary"}
                  >
                    {t} <span className="text-foreground/40">({c})</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border border-foreground/15 bg-background p-6">
        <h2 className="font-display text-xl text-primary">Recent Posts</h2>
        <ul className="mt-4 space-y-4">
          {recent.map((p) => (
            <li key={p._id}>
              <Link href={`/blog/${p.slug}`} className="group flex gap-3">
                <div className="h-14 w-16 shrink-0 overflow-hidden bg-cocoa/10">
                  {p.mainImage ? (
                    <img
                      src={urlFor(p.mainImage).width(128).height(112).url()}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : null}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/50">
                    {formatDate(p.publishedAt)}
                  </p>
                  <p className="line-clamp-2 text-sm font-medium leading-snug text-foreground/85 transition group-hover:text-primary">
                    {p.title}
                  </p>
                </div>
              </Link>
            </li>
          ))}
          {recent.length === 0 ? (
            <li className="text-sm text-foreground/60">Nothing published yet.</li>
          ) : null}
        </ul>
      </div>

      <div className="bg-cocoa p-6 text-cocoa-foreground">
        <p className="text-[11px] uppercase tracking-[0.3em] text-gold">Gifting</p>
        <h2 className="mt-2 font-display text-2xl text-gold">Send a luxury hamper</h2>
        <p className="mt-2 text-sm text-cocoa-foreground/75">
          Handpicked nuts and dates, packed for every occasion.
        </p>
        <Link
          href="/shop?group=gift-hampers"
          className="mt-4 inline-block rounded-full bg-gold px-5 py-2.5 text-sm font-medium text-cocoa transition hover:opacity-90"
        >
          Shop hampers
        </Link>
      </div>
    </aside>
  );
}
