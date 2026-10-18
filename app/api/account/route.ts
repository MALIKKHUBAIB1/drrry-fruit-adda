import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import {
  clearSessionCookie,
  getSessionUser,
  verifyPassword,
} from "@/lib/server/auth";
import { cleanText, rateLimit, readJsonSafe, sameOrigin } from "@/lib/server/security";

/**
 * DELETE /api/account — user ka apna account delete karo.
 *
 * Security:
 * - Login zaroori + password verify (accidental delete impossible)
 * - Origin check + rate limit
 * - Admin account delete nahi ho sakta
 *
 * Data policy:
 * - PII (addresses, reviews, wishlist, cart, newsletter) turant delete
 * - Orders ANONYMISE hoti hain (userId/email/name/phone/address hat jaate hain)
 *   — kyunki sales record legally retain karna zaroori hota hai, par personal
 *     data nahi rakhna chahiye (DPDP Act / GDPR right to erasure).
 */
export async function DELETE(req: NextRequest) {
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || user.id;
  const rl = rateLimit(`acct-del:${ip}`, 5, 15 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again in a few minutes." },
      { status: 429 },
    );
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const body = (parsed.data ?? {}) as Record<string, unknown>;
  const pass = String(body.password ?? "");
  const confirm = cleanText(body.confirm ?? "", 20);

  if (confirm !== "DELETE") {
    return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400 });
  }
  if (!pass) {
    return NextResponse.json({ error: "Enter your password to confirm." }, { status: 400 });
  }

  if (user.isAdmin) {
    return NextResponse.json(
      { error: "Admin accounts cannot be deleted from here." },
      { status: 403 },
    );
  }

  const ok = await updateDb(async (db) => {
    const live = db.users.find((u) => u.id === user.id);
    // Password re-verify DB se — session ke trust pe nahi.
    if (!live || !verifyPassword(pass, live.salt, live.passHash)) return false;

    db.users = db.users.filter((u) => u.id !== user.id);
    db.addresses = db.addresses.filter((a) => a.userId !== user.id);
    db.reviews = db.reviews.filter((r) => r.userId !== user.id);
    db.newsletter = db.newsletter.filter((n) => n.email !== user.email);
    db.carts = Object.fromEntries(Object.entries(db.carts).filter(([k]) => k !== user.id));
    db.wishlists = Object.fromEntries(
      Object.entries(db.wishlists).filter(([k]) => k !== user.id),
    );
    db.contacts = db.contacts.filter(
      (c) => c.email.toLowerCase() !== user.email.toLowerCase(),
    );

    // Orders: history retain, personal data hatao.
    db.orders = db.orders.map((o) =>
      o.userId === user.id
        ? {
            ...o,
            userId: "deleted",
            email: "deleted@removed.invalid",
            name: "Deleted User",
            phone: "",
            address: "",
            city: "",
            state: "",
            pin: "",
            notes: "",
          }
        : o,
    );

    return true;
  });

  if (!ok) {
    return NextResponse.json({ error: "Password is incorrect." }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", clearSessionCookie());
  return res;
}