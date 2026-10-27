"use client";

/**
 * Lightweight client cache for GET requests.
 *
 * Teen problems solve karta hai:
 *  1. Duplicate calls — same URL 2-3 jagah fetch ho rahi thi
 *     (Header + PromoBanner dono /api/settings, CatalogProvider + sections
 *      sab /api/products). Ab ek call + sab ko same promise.
 *  2. Thundering herd — 5 components mount hote hi 5 requests bhi jaate the.
 *     Ab ek request, baaki uska wait karte hain.
 *  3. Reload pe network — catalogue/settings localStorage me cached rehte hain,
 *     TTL ke andar turbat render ho jaata hai, background me refresh hota hai.
 *
 * Personal data (cart/wishlist/orders/account) isme KABHI nahi jaata — sirf
 * public catalogue jaisi cheezein cache hoti hain (isCached me dekho).
 */

type Entry = { at: number; data: unknown };

/**
 * fetch + timeout. Bina timeout ke ek hung request (TCP stall / offline radio)
 * `inflight` entry ko hamesha ke liye jam deta tha — uske baad har
 * cachedGet() us stale value par short-circuit ho jata tha (permanently
 * stale cache). 8s par reject karke entry free karte hain.
 */
function fetchWithTimeout(url: string, ms = 8000) {
  return fetch(url, { signal: AbortSignal.timeout(ms), cache: "no-store" });
}

const memory = new Map<string, Entry>();
const inflight = new Map<string, Promise<unknown>>();

const PREFIX = "dfa-cache:";

// Sirf yehi URLs cache hoti hain — personal/private data kabhi nahi.
const CACHEABLE = ["/api/products", "/api/categories", "/api/settings", "/api/hampers"];

// TTL: catalogue thoda stale reh sakta hai, settings bhi. 60s safe hai.
const TTL = 60_000;

function storageKey(url: string) {
  return PREFIX + url;
}

function readStorage(url: string): Entry | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(storageKey(url));
    if (!raw) return null;
    const e = JSON.parse(raw) as Entry;
    if (typeof e?.at !== "number") return null;
    return e;
  } catch {
    return null;
  }
}

function writeStorage(url: string, data: unknown) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(storageKey(url), JSON.stringify({ at: Date.now(), data }));
  } catch {
    // Quota full — chalo, memory cache phir bhi kaam karega
  }
}

export function isCacheable(url: string) {
  return CACHEABLE.some((p) => url.startsWith(p));
}

/** Age purana cache saaf karo (TTL guzarne ke baad). */
export function pruneCache() {
  const now = Date.now();
  for (const [k, v] of memory) if (now - v.at > TTL * 5) memory.delete(k);
  if (typeof window === "undefined") return;
  for (const p of CACHEABLE) {
    try {
      const raw = localStorage.getItem(storageKey(p));
      if (!raw) continue;
      const e = JSON.parse(raw) as Entry;
      if (now - e.at > TTL * 5) localStorage.removeItem(storageKey(p));
    } catch {
      /* ignore */
    }
  }
}

type Opts = { ttl?: number; bypass?: boolean; revalidate?: boolean };

/**
 * GET with cache. Returns { data, fromCache }.
 * `revalidate: true` → turant cached data de do, background me fresh laao
 *                    (stale-while-revalidate — page turant paint hota hai).
 */
export async function cachedGet<T>(
  url: string,
  opts: Opts = {},
): Promise<{ data: T; fromCache: boolean }> {
  const ttl = opts.ttl ?? TTL;
  const now = Date.now();

  // ---- bypass: seedha network (mutations ke baad) ----
  if (opts.bypass) {
    const fresh = (inflight.get(url) ??
      fetchWithTimeout(url).then((r) => r.json())) as Promise<T>;
    inflight.set(url, fresh);
    try {
      const data = await fresh;
      memory.set(url, { at: Date.now(), data });
      if (isCacheable(url)) writeStorage(url, data);
      return { data, fromCache: false };
    } finally {
      inflight.delete(url);
    }
  }

  // ---- already in-flight: usi ka wait karo (dedupe) ----
  const running = inflight.get(url);
  if (running) return { data: (await running) as T, fromCache: true };

  const hit = memory.get(url) ?? readStorage(url);

  // ---- fresh hit ----
  if (hit && now - hit.at < ttl) {
    return { data: hit.data as T, fromCache: true };
  }

  // ---- stale hit + revalidate: turbat do, peeche refresh karo ----
  if (hit) {
    // Asli network promise ko inflight me daalo. Pehle yahan STALE payload ka
    // resolved promise register hota tha, jisse bypass() network call kiye
    // bina stale data ko naya timestamp de deta tha (stale-forever bug).
    const bg = fetchWithTimeout(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data) => {
        memory.set(url, { at: Date.now(), data });
        if (isCacheable(url)) writeStorage(url, data);
        return data;
      })
      .finally(() => {
        if (inflight.get(url) === bg) inflight.delete(url);
      });
    inflight.set(url, bg);
    return { data: hit.data as T, fromCache: true };
  }

  // ---- cold: network ----
  const p = fetchWithTimeout(url)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then((data) => {
      memory.set(url, { at: Date.now(), data });
      if (isCacheable(url)) writeStorage(url, data);
      return data;
    })
    .finally(() => inflight.delete(url));

  inflight.set(url, p);
  return { data: (await p) as T, fromCache: false };
}

/**
 * Cache turant invalidate karo — koi admin edit / order place hone ke baad.
 */
export function bustCache(urlPrefix?: string) {
  if (!urlPrefix) {
    memory.clear();
    inflight.clear();
    if (typeof window === "undefined") return;
    for (const p of CACHEABLE) localStorage.removeItem(storageKey(p));
    return;
  }
  for (const k of [...memory.keys()]) if (k.startsWith(urlPrefix)) memory.delete(k);
  for (const k of [...inflight.keys()]) if (k.startsWith(urlPrefix)) inflight.delete(k);
  if (typeof window === "undefined") return;
  for (const p of CACHEABLE) {
    if (!p.startsWith(urlPrefix)) continue;
    localStorage.removeItem(storageKey(p));
  }
}