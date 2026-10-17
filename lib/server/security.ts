import "server-only";

// ---------- HTML escape (XSS ke liye) ----------
export function escapeHtml(input: unknown): string {
  if (input == null) return "";
  const str = String(input);
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Dangerous tags/attrs strip karta hai (rich text ke liye).
// Humara app plain text store karta hai, lekin safety ke liye.
const DANGEROUS = /<\s*\/?\s*(script|iframe|object|embed|style|link|meta|form|input|button|svg|img|video|audio|source|base|applet|noscript)[^>]*>/gi;
const EVENT_ATTR = /\son\w+\s*=\s*("([^"]*)"|'([^']*)'|[^\s>]+)/gi;
const JS_URL = /javascript:/gi;

export function sanitize(input: unknown, max = 4000): string {
  if (input == null) return "";
  let s = String(input).slice(0, max);
  // Null bytes aur control chars hatao
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
  // Dangerous HTML
  s = s.replace(DANGEROUS, "");
  s = s.replace(EVENT_ATTR, "");
  s = s.replace(JS_URL, "removed:");
  return s.trim();
}

// Strict text — sirf printable chars, no HTML at all
export function cleanText(input: unknown, max = 500): string {
  if (input == null) return "";
  return String(input)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/<[^>]*>/g, "")
    .slice(0, max)
    .trim();
}

// ---------- Email / phone / slug / url ----------
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}
export function isValidPhone(phone: string): boolean {
  return /^[6-9]\d{9}$/.test(phone);
}
export function isValidPin(pin: string): boolean {
  return /^[1-9]\d{5}$/.test(pin);
}
export function safeSlug(input: unknown): string {
  return String(input ?? "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
export function safeUrl(input: unknown): string {
  const s = String(input ?? "").trim();
  if (!s) return "";
  if (/^(https?:\/\/|\/)/i.test(s) && !/javascript:/i.test(s)) return s.slice(0, 500);
  return "";
}

// ---------- Number coercion ----------
export function toInt(input: unknown, min = 0, max = 1_000_000): number {
  const n = Math.floor(Number(input));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}
export function toFloat(input: unknown, min = 0, max = 1_000_000): number {
  const n = Number(input);
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

// ---------- Rate limiter (in-memory, per process) ----------
const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): { ok: boolean; remaining: number } {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || b.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: max - 1 };
  }
  if (b.count >= max) return { ok: false, remaining: 0 };
  b.count += 1;
  return { ok: true, remaining: max - b.count };
}

// Memory leak guard: buckets ka size control kar
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of buckets) if (v.resetAt < now) buckets.delete(k);
  }, 60_000).unref?.();
}

// ---------- Body size guard ----------
export async function readJsonSafe(req: Request, maxBytes = 50_000): Promise<{ ok: true; data: unknown } | { ok: false; error: string }> {
  try {
    const len = Number(req.headers.get("content-length") ?? 0);
    if (len > maxBytes) return { ok: false, error: "Request body too large." };
    const text = await req.text();
    if (text.length > maxBytes) return { ok: false, error: "Request body too large." };
    if (!text) return { ok: true, data: {} };
    return { ok: true, data: JSON.parse(text) };
  } catch {
    return { ok: false, error: "Invalid JSON body." };
  }
}

// ---------- Origin check (CSRF) ----------
export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return true; // same-origin requests origin nahi bhejte
  const host = req.headers.get("host");
  try {
    const o = new URL(origin);
    return host ? o.host === host : true;
  } catch {
    return false;
  }
}
