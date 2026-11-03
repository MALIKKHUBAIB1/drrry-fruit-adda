import Link from "next/link";
import { PortableText } from "@portabletext/react";
import type { PortableTextComponents } from "@portabletext/react";
import type { PortableTextBlock } from "@portabletext/types";
import { urlFor } from "@/lib/server/sanity";

const components: PortableTextComponents = {
  types: {
    image: ({ value }) => {
      if (!value?.asset) return null;
      return (
        <figure className="my-8">
          <img
            src={urlFor(value).width(1200).url()}
            alt={value.alt || ""}
            loading="lazy"
            className="w-full rounded-lg border border-foreground/10"
          />
          {value.alt ? (
            <figcaption className="mt-2 text-center text-sm text-muted-foreground">{value.alt}</figcaption>
          ) : null}
        </figure>
      );
    },
  },
  block: {
    h2: ({ children }) => (
      <h2 className="mt-10 mb-4 font-display text-3xl font-medium leading-tight text-primary sm:text-4xl">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 mb-3 font-display text-2xl font-medium leading-tight text-primary">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="mt-6 mb-2 font-display text-xl font-medium text-primary">{children}</h4>
    ),
    normal: ({ children }) => <p className="mb-5 leading-7 text-foreground/80">{children}</p>,
    blockquote: ({ children }) => (
      <blockquote className="my-8 border-l-2 border-gold pl-6 font-display text-xl italic leading-relaxed text-foreground/70">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mb-6 list-disc space-y-2 pl-6 leading-7 text-foreground/80 marker:text-gold">{children}</ul>
    ),
    number: ({ children }) => (
      <ol className="mb-6 list-decimal space-y-2 pl-6 leading-7 text-foreground/80 marker:text-gold">{children}</ol>
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const href = value?.href || "";
      if (!href) return children;
      const cls = "text-primary underline decoration-gold/60 underline-offset-4 hover:decoration-gold";
      if (/^https?:\/\//.test(href)) {
        return (
          <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
            {children}
          </a>
        );
      }
      return (
        <Link href={href} className={cls}>
          {children}
        </Link>
      );
    },
  },
};

export default function PostBody({ value }: { value: PortableTextBlock[] }) {
  return <div className="mt-8">{<PortableText value={value} components={components} />}</div>;
}
