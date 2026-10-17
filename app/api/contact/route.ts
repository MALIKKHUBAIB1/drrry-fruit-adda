import { NextResponse } from "next/server";
import { updateDb } from "@/lib/server/db";
import { newId } from "@/lib/server/auth";
import {
  cleanText,
  isValidEmail,
  rateLimit,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

// POST /api/contact { name, email, phone?, message }
export async function POST(req: Request) {
  if (!sameOrigin(req as Request)) {
    return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
  }
  const ip = (req as Request).headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rl = rateLimit(`contact:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many messages. Please try again later." }, { status: 429 });
  }

  const parsed = await readJsonSafe(req, 10_000);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const body = (parsed.data ?? {}) as Record<string, unknown>;

  const name = cleanText(body.name, 80);
  const email = String(body.email ?? "").trim().toLowerCase().slice(0, 254);
  const phone = cleanText(body.phone, 20);
  const message = cleanText(body.message, 2000);

  if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!isValidEmail(email)) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (message.length < 5) return NextResponse.json({ error: "Please write your message." }, { status: 400 });

  const contact = await updateDb((db) => {
    const c = {
      id: newId("C-"),
      name,
      email,
      phone,
      message,
      createdAt: new Date().toISOString(),
    };
    db.contacts.unshift(c);
    return c;
  });

  return NextResponse.json({ ok: true, contact }, { status: 201 });
}
