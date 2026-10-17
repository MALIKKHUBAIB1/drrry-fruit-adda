import { NextResponse, type NextRequest } from "next/server";
import { updateDb } from "@/lib/server/db";
import { ADMIN_DENIED, requireAdmin } from "@/lib/server/admin";
import { cleanText } from "@/lib/server/security";

// POST /api/admin/pincodes/restore?pin= — hidden pincode wapas list me lao
export async function POST(req: NextRequest) {
  const { status } = await requireAdmin(req);
  if (status !== 200) return NextResponse.json({ error: ADMIN_DENIED(status) }, { status });
  const pin = cleanText(new URL(req.url).searchParams.get("pin") ?? "", 6);
  if (!pin) return NextResponse.json({ error: "pin required." }, { status: 400 });

  await updateDb((d) => {
    d.hiddenPincodes = d.hiddenPincodes.filter((p) => p !== pin);
  });
  return NextResponse.json({ ok: true, restored: true });
}