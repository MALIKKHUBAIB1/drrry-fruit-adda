import "server-only";
import { readDb, updateDb } from "./db";
import type { Product } from "@/lib/products";
import { sendBroadcast, wrapEmail } from "./mailer";
import { newId } from "./crypto";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://dryfruitadda.in";

export type AnnounceResult = {
  skipped?: "disabled" | "no-subscribers";
  sent?: number;
  failed?: number;
};

/**
 * Naya product add hone par newsletter subscribers ko email alert bhejo.
 *
 * - settings.newProductAlerts === false ho toh kuch nahi (admin toggle).
 * - 0 subscribers ho toh skip.
 * - Email fail hone par PRODUCT CREATE FAIL NAHI hota — alert best-effort
 *   hai, error upar wala caller ko report hota hai.
 * - Har alert Broadcasts history me record hota hai (createdBy
 *   "auto:new-product") taaki admin dekh sake kya gaya tha.
 */
export async function announceNewProduct(product: Product): Promise<AnnounceResult> {
  const db = await readDb();

  if (db.settings.newProductAlerts === false) return { skipped: "disabled" };

  const recipients = [
    ...new Set(db.newsletter.map((s) => s.email.trim().toLowerCase())),
  ].filter((e) => /.+@.+\..+/.test(e));
  if (!recipients.length) return { skipped: "no-subscribers" };

  const v = product.variants?.[0];
  const price = v ? `₹${v.price}` : "";
  const mrp = v && v.mrp > v.price ? `<span style="text-decoration:line-through;color:#8a7d6d">₹${v.mrp}</span> ` : "";
  const desc = (product.description || "").slice(0, 240);
  const bullets = (product.highlights ?? [])
    .slice(0, 4)
    .map((h) => `<li>${h}</li>`)
    .join("");
  const url = `${SITE}/product/${product.slug}`;

  const subject = `Just in: ${product.name}`;
  const html = wrapEmail(
    subject,
    `<img src="${product.image}" alt="" width="560" style="width:100%;max-width:560px;border-radius:10px;display:block;margin:0 0 18px" />
<p style="margin:0 0 14px">${desc}</p>
${bullets ? `<ul style="margin:0 0 18px;padding-left:18px;line-height:1.8">${bullets}</ul>` : ""}
<p style="margin:0 0 20px;font-size:17px">${mrp}<b>${price}</b></p>
<p style="margin:0"><a href="${url}" style="display:inline-block;background:#2b2118;color:#d4a24c;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600">See it in the shop →</a></p>`,
  );

  const out = await sendBroadcast({ recipients, subject, html, text: subject });

  // History record — Broadcasts tab me dikhe
  await updateDb((d) => {
    d.broadcasts = d.broadcasts ?? [];
    d.broadcasts.push({
      id: newId("BC"),
      subject,
      bodyHtml: html,
      audience: "subscribers",
      status: out.failed > 0 && out.sent === 0 ? "failed" : "sent",
      scheduledAt: null,
      sentAt: new Date().toISOString(),
      recipientCount: recipients.length,
      sentCount: out.sent,
      failedCount: out.failed,
      lastError: out.errors[0] ?? null,
      createdBy: "auto:new-product",
      createdAt: new Date().toISOString(),
    });
    return true;
  });

  return { sent: out.sent, failed: out.failed };
}
