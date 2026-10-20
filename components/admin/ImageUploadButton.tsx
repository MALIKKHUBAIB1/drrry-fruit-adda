"use client";

import { useRef, useState } from "react";

type Props = {
  onUploaded: (url: string) => void;
  /** ImageKit folder: dryfruitadda/{year}/{category}. Na ho to "uncategorised". */
  category?: string;
  label?: string;
  className?: string;
};

/**
 * Admin-only image upload button. File pick karta hai, /api/admin/upload pe
 * bhejta hai, aur mila hua ImageKit URL onUploaded() me deta hai.
 *
 * Private key kabhi browser me nahi jaati — upload route server-side hai.
 */
export default function ImageUploadButton({ onUploaded, category, label = "Upload", className = "" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function pick(file: File) {
    setBusy(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (category) fd.append("category", category);
      const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || `Upload failed (${res.status})`);
      onUploaded(body.url);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <span className="inline-flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className={`rounded-md border border-input px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-60 ${className}`}
      >
        {busy ? "Uploading…" : label}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void pick(f);
        }}
      />
      {err && (
        <span role="alert" className="max-w-[16rem] text-xs text-destructive">
          {err}
        </span>
      )}
    </span>
  );
}
