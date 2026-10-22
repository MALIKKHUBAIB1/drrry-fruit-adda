import "server-only";
import { readDb, type DbOrder, type DbOrderStatus } from "./db";
import { sendEmail, wrapEmail } from "./mailer";

const SITE = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://dryfruitadda.in";
const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// Jin statuses par customer ko mail jaata hai (user requirement:
// order → out-for-delivery → delivered)
const EMAILABLE = new Set<DbOrderStatus>(["placed", "out-for-delivery", "delivered"]);

function itemsHtml(order: DbOrder): string {
  return order.items
    .map(
      (it) =>
        `<p style="margin:0 0 10px;font-size:14px">` +
        `<img src="${it.image}" width="44" height="44" alt="" style="width:44px;height:44px;border-radius:6px;vertical-align:middle;margin-right:10px" />` +
        `<span style="vertical-align:middle">${it.name} <span style="color:#8a7d6d">(${it.variant} × ${it.qty})</span> &nbsp;<b>${inr(it.price * it.qty)}</b></span>` +
        `</p>`,
    )
    .join("");
}

function summary(order: DbOrder): string {
  const label = { cod: "Cash on Delivery", online: "Paid online" }[order.payment];
  return (
    `<p style="margin:14px 0 4px;font-size:15px">Total <b>${inr(order.total)}</b> · ${label}` +
    (order.payment === "online" && order.paymentStatus === "paid" ? " ✓" : "") +
    `</p>`
  );
}

function contentFor(order: DbOrder, status: DbOrderStatus): { subject: string; body: string } | null {
  const track = `${SITE}/track?id=${order.id}`;
  const cta = (href: string, label: string) =>
    `<p style="margin:20px 0"><a href="${href}" style="display:inline-block;background:#2b2118;color:#d4a24c;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600">${label}</a></p>`;

  if (status === "placed") {
    const ship = order.deliveryLabel ? ` via ${order.deliveryLabel}` : "";
    return {
      subject: `Order confirmed — ${order.id}`,
      body:
        `<p>Thanks ${order.name} — we've received your order <b>${order.id}</b>.</p>` +
        itemsHtml(order) +
        summary(order) +
        `<p style="font-size:14px;color:#5b5145">Delivering to: ${order.address}, ${order.city} — ${order.pin}${ship}. Dispatch within 1–2 working days; we'll keep you posted.</p>` +
        cta(track, "Track your order →"),
    };
  }

  if (status === "out-for-delivery") {
    return {
      subject: `Out for delivery — ${order.id}`,
      body:
        `<p>Good news ${order.name} — your order <b>${order.id}</b> is <b>out for delivery</b> today.</p>` +
        `<p style="font-size:14px;color:#5b5145">Our delivery partner may call you on <b>${order.phone}</b> — please keep it handy. ${order.items.length} item(s), ${inr(order.total)}${order.payment === "cod" ? " (pay on delivery)" : ""}.</p>` +
        cta(track, "Track live status →"),
    };
  }

  if (status === "delivered") {
    return {
      subject: `Delivered — ${order.id}`,
      body:
        `<p>${order.name}, your order <b>${order.id}</b> has been delivered 🎉 — we hope you love it.</p>` +
        itemsHtml(order) +
        summary(order) +
        `<p style="font-size:14px;color:#5b5145">Tried it? A quick review on the product page helps other buyers — and your next box is a click away.</p>` +
        cta(`${SITE}/shop`, "Shop again →") +
        `<p style="font-size:13px"><a href="${track}" style="color:#8a7d6d">View this order</a></p>`,
    };
  }

  return null;
}

/**
 * Order status email (customer ko) — placed / out-for-delivery / delivered.
 *
 * - settings.orderStatusEmails === false ho toh skip (admin toggle).
 * - Best effort: email fail ho toh ORDER KA KAM NAHI rukta (na create na
 *   status update). Failure structured log me jaati hai.
 */
export async function sendOrderStatusEmail(
  order: DbOrder,
  status: DbOrderStatus,
): Promise<{ sent?: boolean; dryRun?: boolean; skipped?: string; error?: string }> {
  if (!EMAILABLE.has(status)) return { skipped: "status" };

  const db = await readDb();
  if (db.settings.orderStatusEmails === false) return { skipped: "disabled" };
  if (!order.email || !/.+@.+\..+/.test(order.email)) return { skipped: "no-email" };

  const content = contentFor(order, status);
  if (!content) return { skipped: "status" };

  try {
    const r = await sendEmail({
      to: order.email,
      subject: content.subject,
      html: wrapEmail(content.subject, content.body),
      text: content.subject,
    });
    if (r.ok) {
      console.log(
        JSON.stringify({ level: "info", msg: "order email", orderId: order.id, status, dryRun: !!r.dryRun }),
      );
      return { sent: true, dryRun: r.dryRun };
    }
    console.error(
      JSON.stringify({ level: "error", msg: "order email failed", orderId: order.id, status, error: r.error }),
    );
    return { error: r.error ?? "send failed" };
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ level: "error", msg: "order email failed", orderId: order.id, status, error }));
    return { error };
  }
}
