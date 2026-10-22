import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import type { DbBroadcast } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, sameOrigin } from "@/lib/server/security";
import { mailerConfigured } from "@/lib/server/mailer";
import { deliverBroadcast } from "@/lib/server/broadcast";
import { newId } from "@/lib/server/crypto";

export const runtime = "nodejs";
// Lazy-delivery me 106 emails bhejne me 10s+ lag sakte hain (Hobby plan par
// default function timeout chhoti hoti hai).
export const maxDuration = 60;

// GET /api/admin/broadcasts — sab broadcasts (newest first)
export async function GET(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });

  // Vercel Hobby plan me cron sirf 1 din me 1 baar chal sakta hai — isliye due
  // scheduled broadcasts admin panel khulte hi deliver ho jate hain. Cron (daily)
  // sirf unattended fallback hai.
  const snapshot = await readDb();
  const due = (snapshot.broadcasts ?? []).filter(
    (b) =>
      b.status === "scheduled" &&
      b.scheduledAt &&
      Date.parse(b.scheduledAt) <= Date.now(),
  );
  for (const b of due) {
    try {
      await deliverBroadcast(b, "auto:scheduler");
    } catch (e) {
      console.error(
        JSON.stringify({
          level: "error",
          msg: "broadcast lazy-send failed",
          id: b.id,
          error: e instanceof Error ? e.message : String(e),
        }),
      );
    }
  }

  const db = await readDb();
  const list = [...(db.broadcasts ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return NextResponse.json({ broadcasts: list, count: list.length, mailerConfigured: mailerConfigured() });
}

// POST /api/admin/broadcasts — naya broadcast banao (draft ya scheduled)
export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  const { status, user } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });

  const parsed = await readJsonSafe(req, 50_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const b = (parsed.data ?? {}) as Record<string, unknown>;

  const subject = cleanText(b.subject ?? "", 150);
  const bodyHtml = cleanText(b.bodyHtml ?? "", 20_000);
  if (!subject || !bodyHtml) {
    return NextResponse.json({ error: "subject and bodyHtml are required." }, { status: 400 });
  }
  const audience: DbBroadcast["audience"] =
    b.audience === "subscribers" || b.audience === "both" || b.audience === "test"
      ? (b.audience as DbBroadcast["audience"])
      : "users";

  // scheduledAt future hona chahiye (agar scheduled hai)
  let scheduledAt: string | null = null;
  if (b.status === "scheduled" && typeof b.scheduledAt === "string" && !isNaN(Date.parse(b.scheduledAt))) {
    const t = new Date(b.scheduledAt).getTime();
    if (t > Date.now()) scheduledAt = new Date(t).toISOString();
  }

  const rec: DbBroadcast = {
    id: newId("BC"),
    subject,
    bodyHtml,
    audience,
    status: scheduledAt ? "scheduled" : "draft",
    scheduledAt,
    sentAt: null,
    recipientCount: 0,
    sentCount: 0,
    failedCount: 0,
    lastError: null,
    createdBy: user?.email ?? "admin",
    createdAt: new Date().toISOString(),
  };

  await updateDb((d) => {
    d.broadcasts = d.broadcasts ?? [];
    d.broadcasts.push(rec);
    return true;
  });

  return NextResponse.json({ ok: true, broadcast: rec });
}

// POST /api/admin/broadcasts/send — abhi bhejo (body: { id })
// Ye "send now" hai; scheduled broadcasts cron khud bhejta hai.
export async function PUT(req: NextRequest) {
  if (!sameOrigin(req)) return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  const { status, user } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const id = cleanText((parsed.data as Record<string, unknown>)?.id ?? "", 40);
  if (!id) return NextResponse.json({ error: "id required." }, { status: 400 });

  const db = await readDb();
  const bc = (db.broadcasts ?? []).find((x) => x.id === id);
  if (!bc) return NextResponse.json({ error: "Broadcast not found." }, { status: 404 });
  if (bc.status === "sent") return NextResponse.json({ error: "Already sent." }, { status: 409 });

  const result = await deliverBroadcast(bc, user?.email ?? "admin");

  return NextResponse.json({ ok: result.failed === 0, result, broadcast: result.broadcast });
}
