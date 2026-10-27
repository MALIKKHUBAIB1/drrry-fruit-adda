import { NextResponse, type NextRequest } from "next/server";
import { readDb, updateDb } from "@/lib/server/db";
import { getSessionUser } from "@/lib/server/auth";
import { readJsonSafe, sameOrigin } from "@/lib/server/security";

// GET /api/notifications — apni in-app notifications (+ unread count)
// POST /api/notifications { all?: true, ids?: string[] } — padh liya mark karo
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });

  const db = await readDb();
  const mine = db.notifications
    .filter((n) => (n.audience === "user" ? n.userId === user.id : user.isAdmin))
    .slice(0, 40);
  const unreadCount = mine.filter((n) => !n.readBy.includes(user.id)).length;
  return NextResponse.json({ notifications: mine, unreadCount });
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req);
  if (!user) return NextResponse.json({ error: "Login required." }, { status: 401 });
  if (!sameOrigin(req)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }

  const parsed = await readJsonSafe(req, 5_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as { all?: boolean; ids?: string[] };
  const ids = Array.isArray(body.ids) ? body.ids.map(String).slice(0, 100) : [];

  await updateDb((db) => {
    for (const n of db.notifications) {
      const visible = n.audience === "user" ? n.userId === user.id : user.isAdmin;
      if (!visible) continue;
      if (body.all || ids.includes(n.id)) {
        if (!n.readBy.includes(user.id)) n.readBy.push(user.id);
      }
    }
  });
  return NextResponse.json({ ok: true });
}
