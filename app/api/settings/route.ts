import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText, readJsonSafe, sameOrigin } from "@/lib/server/security";

// GET /api/settings — public promo settings
// Public GET responses browser/CDN cache kar sake — isse repeat visits par
// network hit hi nahi hota (stale-while-revalidate ke saath).
const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
};


export async function GET() {
  const db = await readDb();
  return NextResponse.json({ settings: db.settings }, { headers: CACHE_HEADERS });
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
  const hero = (body.hero ?? null) as Record<string, unknown> | null;

  // Ticker announcements — array ya single string dono accept
  const rawAnn = body.announcements;
  let announcements: string[] | null = null;
  if (Array.isArray(rawAnn)) {
    announcements = rawAnn
      .map((x) => cleanText(String(x ?? ""), 120))
      .filter(Boolean)
      .slice(0, 8);
  } else if (typeof rawAnn === "string") {
    announcements = rawAnn
      .split("\n")
      .map((x) => cleanText(x, 120))
      .filter(Boolean)
      .slice(0, 8);
  }

  const updated = await updateDb((db) => {
    if (announcements?.length) db.settings.announcements = announcements;
    const p = db.settings.promo;
    if (typeof body.newProductAlerts === "boolean") {
      db.settings.newProductAlerts = body.newProductAlerts;
    }
    if (typeof body.orderStatusEmails === "boolean") {
      db.settings.orderStatusEmails = body.orderStatusEmails;
    }
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

    // Hero banner — poora object aata hai (partial nahi) taaki ek field
    // galat na ho jaye. Image URL bhi validate.
    if (hero) {
      const h = db.settings.hero;
      if (typeof hero.enabled === "boolean") h.enabled = hero.enabled;
      if (typeof hero.eyebrow === "string") h.eyebrow = cleanText(hero.eyebrow, 60);
      if (typeof hero.titleLine1 === "string") h.titleLine1 = cleanText(hero.titleLine1, 60);
      if (typeof hero.titleLine2 === "string") h.titleLine2 = cleanText(hero.titleLine2, 60);
      if (typeof hero.subtitle === "string") h.subtitle = cleanText(hero.subtitle, 220);
      if (typeof hero.ctaLabel === "string") h.ctaLabel = cleanText(hero.ctaLabel, 30);
      if (typeof hero.ctaHref === "string") h.ctaHref = cleanText(hero.ctaHref, 200);
      if (typeof hero.cta2Label === "string") h.cta2Label = cleanText(hero.cta2Label, 30);
      if (typeof hero.cta2Href === "string") h.cta2Href = cleanText(hero.cta2Href, 200);
      if (typeof hero.image === "string") h.image = cleanText(hero.image, 500);
    }
    return db.settings;
  });

  return NextResponse.json({ settings: updated });
}
