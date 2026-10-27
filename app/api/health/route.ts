import { NextResponse, type NextRequest } from "next/server";
import { readDb, getProducts } from "@/lib/server/db";
import { log } from "@/lib/server/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — liveness + readiness.
 *
 * Public: returns only a coarse status (no internals, no counts).
 * With ?detail=1 it returns richer info, still no secrets/PII.
 */
export async function GET(req: NextRequest) {
  const started = Date.now();
  const detail = new URL(req.url).searchParams.get("detail") === "1";

  const checks: Record<string, { ok: boolean; ms?: number; info?: Record<string, unknown> }> =
    {};

  // ---- DB readable + writable ----
  const dbStart = Date.now();
  try {
    const db = await readDb();
    checks.db = {
      ok: true,
      ms: Date.now() - dbStart,
      info: {
        products: db.products.length,
        orders: db.orders.length,
        users: db.users.length,
      },
    };
  } catch (e) {
    checks.db = { ok: false, ms: Date.now() - dbStart, info: { error: (e as Error).message } };
  }

  // ---- Catalogue query path (the hot read path) ----
  const prodStart = Date.now();
  try {
    const p = await getProducts();
    checks.catalogue = { ok: p.length > 0, ms: Date.now() - prodStart };
  } catch {
    checks.catalogue = { ok: false, ms: Date.now() - prodStart };
  }

  // ---- Sessions table health (it grows forever — early warning) ----
  let sessionCount = 0;
  try {
    sessionCount = (await readDb()).sessions.length;
  } catch {
    /* already reported above */
  }

  const healthy = checks.db.ok && checks.catalogue.ok;
  const ms = Date.now() - started;

  if (!healthy) {
    log.error("health check failed", { checks, ms });
  }

  const body = detail
    ? {
        status: healthy ? "ok" : "error",
        ms,
        checks,
        sessionCount,
        sessionCountWarning: sessionCount > 1000 ? "sessions never pruned — run cleanup" : undefined,
        uptimeSec: Math.round(process.uptime()),
      }
    : { status: healthy ? "ok" : "error" };

  return NextResponse.json(body, { status: healthy ? 200 : 503 });
}

/**
 * HEAD /api/health — for uptime monitors that only need a status code.
 */
export async function HEAD(req: NextRequest) {
  const res = await GET(req);
  return new Response(null, { status: res.status });
}