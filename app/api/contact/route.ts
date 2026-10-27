import { NextResponse } from "next/server";
import { updateDb } from "@/lib/server/db";
import { newId } from "@/lib/server/auth";
import { sendEmail, wrapEmail } from "@/lib/server/mailer";
import {
  cleanText,
  isValidEmail,
  rateLimit,
  readJsonSafe,
  sameOrigin,
} from "@/lib/server/security";

// Query notification recipients — QUERY_NOTIFY_EMAILS (comma-separated)
// override karta hai, warna default list chalti hai.
const QUERY_NOTIFY_RECIPIENTS = (
  process.env.QUERY_NOTIFY_EMAILS?.trim() ||
  "info@dryfruitadda.in,info@dryfruitaddaa.in,dryfruitadda5@gmail.com,khubaib9221@gmail.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter((e) => /.+@.+\..+/.test(e));

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// Best-effort — ek recipient fail ho to baaki ko rokna nahi, aur contact
// save hone se pehle SMTP hang me request nahi atakni chahiye.
async function notifyQuery(c: { name: string; email: string; phone: string; message: string; createdAt: string }) {
  const subject = `New query from ${c.name}`;
  const html = wrapEmail(
    subject,
    `<p style="margin:0 0 14px"><b>${esc(c.name)}</b> sent a query from the website contact form.</p>
<p style="margin:0 0 6px"><b>Email:</b> ${esc(c.email)}${c.phone ? `<br><b>Phone:</b> ${esc(c.phone)}` : ""}</p>
<p style="margin:14px 0 0;padding:14px;background:#f6f2ea;border-radius:8px;white-space:pre-wrap">${esc(c.message)}</p>
<p style="margin:14px 0 0;color:#8a7d6d;font-size:13px">Received: ${esc(c.createdAt)}</p>`,
  );
  const text = `${c.name} (${c.email}${c.phone ? `, ${c.phone}` : ""}) sent a query:\n\n${c.message}`;
  await Promise.all(
    QUERY_NOTIFY_RECIPIENTS.map((to) => sendEmail({ to, subject, html, text, replyTo: c.email })),
  );
}

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

  await notifyQuery(contact).catch((e) =>
    console.error(
      JSON.stringify({ level: "error", msg: "query notify failed", error: String(e) }),
    ),
  );

  return NextResponse.json({ ok: true, contact }, { status: 201 });
}
