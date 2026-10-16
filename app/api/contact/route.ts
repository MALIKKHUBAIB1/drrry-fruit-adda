import { NextResponse } from "next/server";
import { updateDb } from "@/lib/server/db";
import { newId } from "@/lib/server/auth";

// POST /api/contact { name, email, phone?, message }
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim();
  const phone = String(body.phone ?? "").trim();
  const message = String(body.message ?? "").trim();

  if (name.length < 2) return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  if (message.length < 5)
    return NextResponse.json({ error: "Please write your message." }, { status: 400 });

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
