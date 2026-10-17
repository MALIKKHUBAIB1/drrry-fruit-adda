import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, sameOrigin } from "@/lib/server/security";

// GET /api/settings — public promo settings
export async function GET() {
  const db = await readDb();
  return NextResponse.json({ settings: db.settings });
}

// PUT /api/settings — admin only (promo update)
export async function PUT(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const promo = (body.promo ?? {}) as Record<string, unknown>;

  const updated = await updateDb((db) => {
    const p = db.settings.promo;
    if (typeof promo.enabled === "boolean") p.enabled = promo.enabled;
    if (typeof promo.title === "string") p.title = cleanText(promo.title, 120);
    if (typeof promo.subtitle === "string") p.subtitle = cleanText(promo.subtitle, 160);
    if (typeof promo.couponCode === "string") p.couponCode = cleanText(promo.couponCode, 20).toUpperCase();
    if (typeof promo.expiresAt === "string" && !isNaN(Date.parse(promo.expiresAt))) {
      p.expiresAt = new Date(promo.expiresAt).toISOString();
    }
    if (typeof promo.ctaLabel === "string") p.ctaLabel = cleanText(promo.ctaLabel, 40);
    if (typeof promo.ctaHref === "string") p.ctaHref = cleanText(promo.ctaHref, 200);
    if (typeof promo.bgColor === "string" && /^#[0-9a-fA-F]{6}$/.test(promo.bgColor)) {
      p.bgColor = promo.bgColor;
    }
    return db.settings;
  });

  return NextResponse.json({ settings: updated });
}
