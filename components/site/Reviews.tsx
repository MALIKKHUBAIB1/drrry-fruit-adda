"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PenLine, Star, Trash2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

export type Review = {
  id: string;
  productSlug: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  createdAt: string;
};

function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="flex items-center gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(size, s <= Math.round(value) ? "fill-gold text-gold" : "text-border")}
        />
      ))}
    </span>
  );
}

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <span className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          aria-label={`${s} star${s > 1 ? "s" : ""}`}
          onMouseEnter={() => setHover(s)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(s)}
          className="p-0.5"
        >
          <Star
            className={cn(
              "h-7 w-7 transition",
              (hover || value) >= s ? "fill-gold text-gold" : "text-border hover:text-gold",
            )}
          />
        </button>
      ))}
    </span>
  );
}

export function ReviewsSection({
  slug,
  fallbackRating,
  fallbackCount,
}: {
  slug: string;
  fallbackRating: number;
  fallbackCount: number;
}) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [avg, setAvg] = useState(fallbackRating);
  const [count, setCount] = useState(fallbackCount);
  const [dist, setDist] = useState<{ star: number; count: number }[]>([]);
  const [myReview, setMyReview] = useState<Review | null>(null);
  const [loading, setLoading] = useState(true);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reviews?slug=${encodeURIComponent(slug)}`, {
        credentials: "include",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't load reviews.");
      setReviews(d.reviews);
      setAvg(d.count > 0 ? d.avg : fallbackRating);
      setCount(d.count > 0 ? d.count : fallbackCount);
      setDist(d.dist);
      setMyReview(d.myReview);
      if (d.myReview) {
        setRating(d.myReview.rating);
        setTitle(d.myReview.title);
        setComment(d.myReview.comment);
      }
    } catch {
      // fallback rating dikhta rahega
    } finally {
      setLoading(false);
    }
  }, [slug, fallbackRating, fallbackCount]);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ slug, rating, title, comment }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Couldn't save your review.");
      setShowForm(false);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save your review.");
    } finally {
      setBusy(false);
    }
  };

  const removeMine = async () => {
    if (!myReview || !confirm("Delete your review?")) return;
    try {
      const res = await fetch(`/api/reviews?id=${encodeURIComponent(myReview.id)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Couldn't delete your review.");
      setRating(5);
      setTitle("");
      setComment("");
      await load();
    } catch {}
  };

  return (
    <section className="mt-16 sm:mt-20" aria-label="Customer reviews">
      <h2 className="text-3xl font-semibold text-primary">Customer Reviews</h2>

      {/* Summary */}
      <div className="mt-6 grid gap-6 rounded-xl border border-border bg-card p-5 sm:grid-cols-[auto_1fr_auto] sm:items-center sm:gap-10 sm:p-6">
        <div className="text-center sm:text-left">
          <p className="font-display text-5xl font-semibold text-primary">{avg.toFixed(1)}</p>
          <div className="mt-1 flex justify-center sm:justify-start">
            <Stars value={avg} />
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{count} verified reviews</p>
        </div>
        <div className="space-y-1.5">
          {(dist.length > 0
            ? dist
            : [5, 4, 3, 2, 1].map((star) => ({ star, count: 0 }))
          ).map((d) => (
            <div key={d.star} className="flex items-center gap-2 text-xs">
              <span className="w-7 shrink-0 text-muted-foreground">{d.star} ★</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-border">
                <span
                  className="block h-full rounded-full bg-gold"
                  style={{ width: `${count > 0 ? Math.round((d.count / count) * 100) : 0}%` }}
                />
              </span>
              <span className="w-6 shrink-0 text-right text-muted-foreground">{d.count}</span>
            </div>
          ))}
        </div>
        <div>
          {user ? (
            <button
              onClick={() => setShowForm((s) => !s)}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa sm:w-auto"
            >
              <PenLine className="h-4 w-4" /> {myReview ? "Edit your review" : "Write a review"}
            </button>
          ) : (
            <Link
              href={`/login?redirect=/product/${slug}`}
              className="block rounded-md bg-primary px-6 py-2.5 text-center text-sm font-medium text-primary-foreground hover:bg-cocoa"
            >
              Login to review
            </Link>
          )}
        </div>
      </div>

      {/* Form */}
      {showForm && user && (
        <form
          onSubmit={submit}
          className="mt-4 space-y-4 rounded-xl border border-gold/30 bg-gold/[0.04] p-5 sm:p-6"
        >
          <div>
            <p className="text-sm font-medium">
              Your rating <span className="text-destructive">*</span>
            </p>
            <div className="mt-1.5">
              <StarPicker value={rating} onChange={setRating} />
            </div>
          </div>
          <label className="block text-sm font-medium">
            Headline (optional)
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="e.g. Fresh and crunchy!"
              className="mt-1.5 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </label>
          <label className="block text-sm font-medium">
            Review <span className="text-destructive">*</span>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              required
              rows={4}
              maxLength={1000}
              placeholder="How was the quality, taste and packing?"
              className="mt-1.5 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-gold"
            />
          </label>
          {err && (
            <p role="alert" className="text-sm text-destructive">
              {err}
            </p>
          )}
          <div className="flex flex-wrap gap-2">
            <button
              disabled={busy}
              className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-cocoa disabled:opacity-60"
            >
              {busy ? "Saving…" : myReview ? "Update review" : "Submit review"}
            </button>
            {myReview && (
              <button
                type="button"
                onClick={removeMine}
                className="flex items-center gap-1.5 rounded-md border border-input px-4 py-2.5 text-sm text-muted-foreground hover:border-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Reviewing as <b>{user.name}</b> — one review per product; submitting again will update
            it.
          </p>
        </form>
      )}

      {/* List */}
      <div className="mt-6">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No reviews yet — be the first to write one!
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {reviews.map((r) => (
              <li
                key={r.id}
                className="flex flex-col rounded-xl border border-black/[0.06] bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <Stars value={r.rating} />
                  <time className="text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </time>
                </div>
                {r.title && <p className="mt-2 font-medium">{r.title}</p>}
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{r.comment}</p>
                <p className="mt-3 flex items-center gap-2 text-sm">
                  <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 font-semibold text-primary">
                    {r.userName.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium">
                    {r.userName}
                    {myReview?.id === r.id && (
                      <span className="ml-2 rounded-full bg-gold/20 px-2 py-0.5 text-[11px] font-medium text-cocoa">
                        Your review
                      </span>
                    )}
                  </span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
