import "server-only";
import { readDb, updateDb, type DbBroadcast } from "./db";
import { sendBroadcast, wrapEmail } from "./mailer";

// Recipients nikaal kar actual send. Cron aur admin dono isse use karte hain.
// (Route file me export nahi — Next.js wahan sirf HTTP handlers expect karta hai.)
export async function deliverBroadcast(
  bc: DbBroadcast,
  actor: string,
): Promise<{ sent: number; failed: number; errors: string[]; broadcast: DbBroadcast }> {
  const db = await readDb();

  let recipients: string[] = [];
  if (bc.audience === "test") {
    // Preview mode — sirf apne aap ko bhejo (quota bacha rehta hai, domain
    // verify se pehle bhi test chal jaata hai jab RESEND_TEST_TO gmail ho).
    const to = process.env.RESEND_TEST_TO?.trim() || process.env.ADMIN_EMAIL?.trim() || "";
    recipients = to ? [to] : [];
  }
  if (bc.audience === "users" || bc.audience === "both") {
    recipients.push(...db.users.map((u) => u.email));
  }
  if (bc.audience === "subscribers" || bc.audience === "both") {
    recipients.push(...db.newsletter.map((n) => n.email));
  }

  // sending mark karo (double-send rokne ke liye)
  await updateDb((d) => {
    const t = (d.broadcasts ?? []).find((x) => x.id === bc.id);
    if (t) {
      t.status = "sending";
      t.recipientCount = recipients.length;
    }
    return true;
  });

  const html = wrapEmail(bc.subject, bc.bodyHtml);
  const out = await sendBroadcast({ recipients, subject: bc.subject, html, text: bc.subject });

  const updated: DbBroadcast = {
    ...bc,
    status: out.failed > 0 && out.sent === 0 ? "failed" : "sent",
    sentAt: new Date().toISOString(),
    recipientCount: recipients.length,
    sentCount: out.sent,
    failedCount: out.failed,
    lastError: out.errors[0] ?? null,
    createdBy: actor,
  };

  await updateDb((d) => {
    const i = (d.broadcasts ?? []).findIndex((x) => x.id === bc.id);
    if (i >= 0) d.broadcasts[i] = updated;
    return true;
  });

  return { ...out, broadcast: updated };
}
