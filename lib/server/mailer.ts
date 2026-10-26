import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

// SMTP — transactional + broadcast email.
//
// SMTP_HOST missing ho toh mailer DRY RUN mode me chalta hai: kuch
// bhejta nahi, sirf structured log likhta hai. Isse dev/prod me bina SMTP ke
// bhi poora broadcast flow test ho jata hai, aur koi crash nahi hota.
const host = process.env.SMTP_HOST?.trim();
const port = Number(process.env.SMTP_PORT?.trim() || "587");
const secureSetting = process.env.SMTP_SECURE?.trim().toLowerCase();
const secure = secureSetting ? secureSetting === "true" : port === 465;
const user = process.env.SMTP_USER?.trim();
const pass = process.env.SMTP_PASS;
const from = process.env.SMTP_FROM?.trim() || "Dryfruit Adda <no-reply@dryfruitadda.in>";

export function mailerConfigured(): boolean {
  return Boolean(host);
}

let instance: Transporter | null = null;
function transporter(): Transporter {
  if (!host) throw new Error("SMTP_HOST is not set");
  if ((user && !pass) || (!user && pass)) {
    throw new Error("SMTP_USER and SMTP_PASS must both be set when using SMTP authentication");
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("SMTP_PORT must be a valid port number");
  }
  if (!instance) {
    instance = nodemailer.createTransport({
      host,
      port,
      secure,
      ...(user && pass ? { auth: { user, pass } } : {}),
    });
  }
  return instance;
}

export type SendResult = {
  ok: boolean;
  id?: string;
  dryRun: boolean;
  error?: string;
};

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
}): Promise<SendResult> {
  const to = Array.isArray(opts.to) ? opts.to : [opts.to];

  // Dry run — host nahi hai. Log karke "success" return karte hain taaki
  // broadcast flow aage badhe aur dev me error na aaye.
  if (!host) {
    console.log(
      JSON.stringify({
        level: "info",
        msg: "email dry-run (no SMTP_HOST)",
        to: to.length === 1 ? to[0] : `${to.length} recipients`,
        subject: opts.subject,
      }),
    );
    return { ok: true, dryRun: true, id: `dry_${Date.now().toString(36)}` };
  }

  try {
    const res = await transporter().sendMail({
      from,
      to,
      subject: opts.subject,
      html: opts.html ?? opts.text ?? "",
      ...(opts.text ? { text: opts.text } : {}),
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });
    return { ok: true, dryRun: false, id: res.messageId };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(JSON.stringify({ level: "error", msg: "sendEmail failed", error: msg }));
    return { ok: false, dryRun: false, error: msg };
  }
}

export async function sendBroadcast(opts: {
  recipients: string[];
  subject: string;
  html?: string;
  text?: string;
}): Promise<{ sent: number; failed: number; errors: string[] }> {
  const errors: string[] = [];
  let sent = 0;
  let failed = 0;

  const list = [...new Set(opts.recipients.map((e) => e.trim().toLowerCase()))].filter((e) =>
    /.+@.+\..+/.test(e),
  );

  // Per-recipient send (concurrency 5) — ek invalid/poora batch-failing
  // address doosron ko na mare, aur har recipient ka accurate result mile.
  // Dry-run me sendEmail hi pehle return kar deta hai.
  let next = 0;
  const worker = async () => {
    while (next < list.length) {
      const to = list[next++];
      const r = await sendEmail({
        to: [to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      });
      if (r.ok) sent += 1;
      else {
        failed += 1;
        if (errors.length < 5) errors.push(`${to}: ${r.error}`);
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(5, list.length) }, worker));

  return { sent, failed, errors };
}

// Simple branded HTML wrapper — admin sirf body likhe, wrapper lag jaye.
// Logo + social links sab inline styles (email clients flexbox/SVG ko kabhi
// kabhi drop karte hain, isliye vertical-align wala simple markup).
export function wrapEmail(title: string, bodyHtml: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f6f2ea;font-family:Georgia,serif;color:#2b2118">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5d9c5">
    <div style="background:#2b2118;padding:16px 24px">
      <img src="https://ik.imagekit.io/kjm6lzdqi/dryfruitadda/products/logo-sm_8aov28_Ti.jpg" width="40" height="40" alt="" style="width:40px;height:40px;border-radius:50%;vertical-align:middle;margin-right:12px" />
      <span style="color:#d4a24c;font-size:18px;letter-spacing:.18em;text-transform:uppercase;vertical-align:middle">Dryfruit Adda</span>
    </div>
    <div style="padding:28px 24px">
      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.25">${title}</h1>
      <div style="font-size:15px;line-height:1.65">${bodyHtml}</div>
    </div>
    <div style="padding:16px 24px;border-top:1px solid #eee;font-size:12px;color:#8a7d6d">
      <p style="margin:0 0 8px">You are receiving this because you shopped or subscribed at Dryfruit Adda.</p>
      <p style="margin:0">
        <a href="https://www.instagram.com/dryfruitadda_1" style="color:#8a7d6d">Instagram</a>
        &nbsp;&middot;&nbsp;
        <a href="https://www.facebook.com/share/1ePTjcvYds/" style="color:#8a7d6d">Facebook</a>
        &nbsp;&middot;&nbsp;
        <a href="https://www.youtube.com/@dryfruitadda" style="color:#8a7d6d">YouTube</a>
        &nbsp;&middot;&nbsp;
        <a href="https://dryfruitadda.in" style="color:#8a7d6d">dryfruitadda.in</a>
      </p>
    </div>
  </div>
</body></html>`;
}
