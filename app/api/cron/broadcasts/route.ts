import { NextResponse, type NextRequest } from "next/server";
import { readDb } from "@/lib/server/db";
import { deliverBroadcast } from "@/lib/server/broadcast";

export const runtime = "nodejs";
// Vercel cron default 10s timeout hai — bade broadcast pe zyada lag sakta
// hai, isliye badha diya. Self-hosted pe koi farak nahi.
export const maxDuration = 60;

// GET /api/cron/broadcasts — scheduled broadcasts bhej deta hai.
//
// Cron service (Vercel Cron / GitHub Actions / cron-job.org) isse har minute
// call karegi. CRON_SECRET se protect hai, warna koi bhi broadcast trigger
// kar sakta tha.
//
//   curl -H "Authorization: Bearer $CRON_SECRET" https://site/api/cron/broadcasts
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  const got =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ??
    new URL(req.url).searchParams.get("secret") ??
    "";

  // Secret set ho toh mandatory; set na ho toh localhost pe chalne do (dev).
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(req.nextUrl.origin);
  if (secret) {
    if (got !== secret) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }
  } else if (!isLocal) {
    return NextResponse.json(
      { error: "CRON_SECRET is not set. Refusing to run cron outside localhost." },
      { status: 503 },
    );
  }

  const now = Date.now();
  const db = await readDb();
  const due = (db.broadcasts ?? []).filter(
    (b) => b.status === "scheduled" && b.scheduledAt && new Date(b.scheduledAt).getTime() <= now,
  );

  if (!due.length) {
    return NextResponse.json({ ok: true, processed: 0, message: "nothing due" });
  }

  const results = [];
  for (const bc of due) {
    try {
      const r = await deliverBroadcast(bc, "cron");
      results.push({ id: bc.id, subject: bc.subject, sent: r.sent, failed: r.failed });
    } catch (e) {
      results.push({ id: bc.id, error: e instanceof Error ? e.message : String(e) });
    }
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    results,
    timestamp: new Date().toISOString(),
  });
}
