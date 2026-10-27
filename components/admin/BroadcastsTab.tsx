"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type BC = {
  id: string;
  subject: string;
  bodyHtml: string;
  audience: "users" | "subscribers" | "both" | "test";
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  scheduledAt: string | null;
  sentAt: string | null;
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  lastError: string | null;
  createdAt: string;
};

const F = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm";
const L = "text-xs uppercase tracking-wider text-muted-foreground";

const STATUS_STYLE: Record<BC["status"], string> = {
  draft: "bg-muted text-muted-foreground",
  scheduled: "bg-amber-100 text-amber-800",
  sending: "bg-blue-100 text-blue-800",
  sent: "bg-emerald-100 text-emerald-800",
  failed: "bg-red-100 text-red-800",
};

const CODE_BOX =
  "background:#fdf6e8;border:1px solid #ecd9b0;border-radius:8px;padding:12px 16px;margin:20px 0";
const CTA =
  "display:inline-block;background:#2b2118;color:#d4a24c;padding:12px 26px;border-radius:8px;text-decoration:none;font-weight:600";

// Ready-made campaigns — select karke form bhar jaata hai. Sirf codes/dates
// DB ke active coupons se: DRYFRUIT20 (20% off ₹1,499+, till 16 Dec),
// WELCOME10 (10% off ₹499+, till 16 Nov). Links absolute hain (email me
// relative link kaam nahi karta).
const TEMPLATES: {
  id: string;
  name: string;
  audience: BC["audience"];
  subject: string;
  body: string;
}[] = [
  {
    id: "diwali",
    name: "Diwali gifting — 20% off hampers",
    audience: "both",
    subject: "Diwali Gifting Is Open — 20% Off Gift Hampers",
    body: `<p>Diwali is on <b>8 November</b> — and our best hampers sell out weeks before. The <b>Signature Dry Fruit Gift Box</b> (₹1,499) is packed with handpicked almonds, cashews, pistachios, dates and figs, beautifully boxed and ready to gift.</p>
<p style="${CODE_BOX}"><b>Code DRYFRUIT20</b> — flat 20% off on orders above ₹1,499, valid till 16 December. Free shipping above ₹999, Cash on Delivery across India.</p>
<p><a href="https://dryfruitadda.in/shop?group=gift-hampers" style="${CTA}">Shop Gift Hampers →</a></p>`,
  },
  {
    id: "welcome",
    name: "First order — 10% off (WELCOME10)",
    audience: "users",
    subject: "10% off your first box of premium dry fruits",
    body: `<p>Never ordered from us? Here's a little welcome — <b>10% off</b> on your first order of premium dry fruits, nuts and dates.</p>
<p style="${CODE_BOX}"><b>Code WELCOME10</b> — 10% off on orders above ₹499, valid till 16 November.</p>
<p>Handpicked lots, hygienically packed, delivered anywhere in India — with Cash on Delivery if you'd rather pay at your door, and free shipping above ₹999.</p>
<p><a href="https://dryfruitadda.in/shop" style="${CTA}">Shop all dry fruits →</a></p>`,
  },
  {
    id: "shipping",
    name: "Free shipping + COD push",
    audience: "users",
    subject: "Free shipping above ₹999 — and COD, pan-India",
    body: `<p>Two things our customers ask for most: <b>free delivery</b> and <b>Cash on Delivery</b>. You get both here.</p>
<ul style="line-height:1.9">
<li><b>Free shipping</b> on orders above ₹999 (charges start at ₹49 below that, by zone)</li>
<li><b>COD across India</b> — pay only when your box reaches you</li>
<li>Dispatched in 1–2 working days, with tracking on every order</li>
</ul>
<p>And <b>WELCOME10</b> gives you 10% off your first order above ₹499.</p>
<p><a href="https://dryfruitadda.in/shop?sort=popular" style="${CTA}">Shop best sellers →</a></p>`,
  },
  {
    id: "deadline",
    name: "Diwali deadline — schedule ~1 Nov",
    audience: "both",
    subject: "Order by 4 Nov to reach you before Diwali",
    body: `<p>Diwali falls on <b>8 November</b> this year. Orders are dispatched within 1–2 working days, and the exact delivery time for your PIN code shows at checkout — so if you want your gifts in hand before the festival, <b>order by 4 November</b> (a little earlier for remote PIN codes).</p>
<p>Gifting a lot? <b>DRYFRUIT20</b> takes 20% off orders above ₹1,499, valid till 16 December.</p>
<p><a href="https://dryfruitadda.in/shop?group=gift-hampers" style="${CTA}">Order your hamper →</a></p>`,
  },
];


export default function BroadcastsTab() {
  const [list, setList] = useState<BC[]>([]);
  const [configured, setConfigured] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<BC["audience"]>("both");
  const [mode, setMode] = useState<"now" | "schedule">("now");
  const [when, setWhen] = useState("");
  const [tpl, setTpl] = useState("");
  const [alerts, setAlerts] = useState(true);
  const [orderMails, setOrderMails] = useState(true);
  const [alertsBusy, setAlertsBusy] = useState(false);

  const applyTemplate = (id: string) => {
    setTpl(id);
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    setSubject(t.subject);
    setBody(t.body);
    setAudience(t.audience);
  };

  async function load() {
    const r = await fetch("/api/admin/broadcasts", { cache: "no-store" });
    const b = await r.json();
    setList(b.broadcasts ?? []);
    setConfigured(b.mailerConfigured ?? false);
    const s2 = await fetch("/api/settings", { cache: "no-store" }).catch(() => null);
    if (s2?.ok) {
      const st = await s2.json();
      if (typeof st.settings?.newProductAlerts === "boolean") setAlerts(st.settings.newProductAlerts);
      if (typeof st.settings?.orderStatusEmails === "boolean") setOrderMails(st.settings.orderStatusEmails);
    }
  }

  async function savePref(
    key: "newProductAlerts" | "orderStatusEmails",
    value: boolean,
    apply: (v: boolean) => void,
    onMsg: string,
    offMsg: string,
  ) {
    setAlertsBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      if (!r.ok) throw new Error("Couldn't save setting.");
      apply(value);
      setOk(value ? onMsg : offMsg);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Couldn't save setting.");
    } finally {
      setAlertsBusy(false);
    }
  }
  useEffect(() => {
    void load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const r = await fetch("/api/admin/broadcasts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          bodyHtml: body,
          audience,
          status: mode === "schedule" ? "scheduled" : "draft",
          scheduledAt: mode === "schedule" && when ? new Date(when).toISOString() : undefined,
        }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Create failed");

      if (mode === "now") {
        // create + send immediately
        const s = await fetch("/api/admin/broadcasts", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: b.broadcast.id }),
        });
        const sb = await s.json();
        if (!s.ok) throw new Error(sb.error || "Send failed");
        setOk(`Sent to ${sb.result.sent} recipient(s)${sb.result.failed ? `, ${sb.result.failed} failed` : ""}.`);
      } else {
        setOk(`Scheduled for ${new Date(b.broadcast.scheduledAt!).toLocaleString()}. Cron will send it.`);
      }
      setSubject("");
      setBody("");
      setWhen("");
      setTpl("");
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function sendNow(id: string) {
    setBusy(true);
    setErr(null);
    setOk(null);
    try {
      const r = await fetch("/api/admin/broadcasts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const b = await r.json();
      if (!r.ok) throw new Error(b.error || "Send failed");
      setOk(`Sent to ${b.result.sent} recipient(s).`);
      await load();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {!configured && (
        <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <b>SMTP_HOST not set</b> — emails run in dry-run mode. Nothing is actually
          emailed, only logged. Add your SMTP settings to .env to send real email.
        </p>
      )}

      <div className="rounded-xl border border-gold/40 bg-card px-5 py-1">
        {[
          {
            key: "newProductAlerts" as const,
            val: alerts,
            apply: setAlerts,
            title: "New-product email alerts",
            desc: "Automatically email all newsletter subscribers whenever you add a product.",
            on: "New-product alerts ON — subscribers will get an email when you add a product.",
            off: "New-product alerts OFF.",
          },
          {
            key: "orderStatusEmails" as const,
            val: orderMails,
            apply: setOrderMails,
            title: "Order status emails",
            desc: "Email customers on order placed, out for delivery, and delivered.",
            on: "Order status emails ON.",
            off: "Order status emails OFF.",
          },
        ].map((row) => (
          <div
            key={row.key}
            className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 py-4 last:border-0"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{row.title}</p>
              <p className="text-xs text-muted-foreground">{row.desc}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={row.val}
              disabled={alertsBusy}
              onClick={() => void savePref(row.key, !row.val, row.apply, row.on, row.off)}
              className={cn(
                "relative h-7 w-14 shrink-0 rounded-full transition disabled:opacity-60",
                row.val ? "bg-primary" : "bg-input",
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all",
                  row.val ? "left-8" : "left-1",
                )}
              />
            </button>
          </div>
        ))}
      </div>

      <form onSubmit={create} className="space-y-4 rounded-xl border border-gold/40 bg-card p-5 shadow-sm">
        <h3 className="text-lg font-semibold">New Broadcast</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">
            <span className={L}>Start from template</span>
            <select value={tpl} onChange={(e) => applyTemplate(e.target.value)} className={`${F} mt-1.5`}>
              <option value="">Blank</option>
              {TEMPLATES.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            <span className={L}>Subject</span>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} required maxLength={150} placeholder="Diwali Offer — Flat 20% Off" className={`${F} mt-1.5`} />
          </label>
          <label className="text-sm font-medium sm:col-span-2">
            <span className={L}>Body (HTML allowed)</span>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} required rows={5} placeholder="<p>Celebrate with premium dry fruits. Use code <b>DIWALI20</b>.</p>" className={`${F} mt-1.5 font-mono text-xs`} />
          </label>
          <label className="text-sm font-medium">
            <span className={L}>Audience</span>
            <select value={audience} onChange={(e) => setAudience(e.target.value as BC["audience"])} className={`${F} mt-1.5`}>
              <option value="users">All users</option>
              <option value="subscribers">Newsletter subscribers</option>
              <option value="both">Users + subscribers</option>
              <option value="test">Test — only my inbox (SMTP_TEST_TO)</option>
            </select>
          </label>
          <label className="text-sm font-medium">
            <span className={L}>Send</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as "now" | "schedule")} className={`${F} mt-1.5`}>
              <option value="now">Send now</option>
              <option value="schedule">Schedule (cron)</option>
            </select>
          </label>
          {mode === "schedule" && (
            <label className="text-sm font-medium sm:col-span-2">
              <span className={L}>Send at</span>
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} required className={`${F} mt-1.5`} />
            </label>
          )}
        </div>
        {err && <p role="alert" className="rounded-md border border-destructive/25 bg-destructive/[0.06] px-4 py-2.5 text-sm text-destructive">{err}</p>}
        {ok && <p className="text-sm text-emerald-600">{ok}</p>}
        <button disabled={busy} className="rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-60">
          {busy ? "Working…" : mode === "now" ? "Send broadcast" : "Schedule broadcast"}
        </button>
      </form>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">History</div>
        {list.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-muted-foreground">No broadcasts yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{b.subject}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(b.createdAt).toLocaleString()} · {b.audience}
                    {b.status === "sent" && ` · ${b.sentCount}/${b.recipientCount} sent`}
                    {b.lastError && ` · ${b.lastError}`}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[b.status]}`}>{b.status}</span>
                {(b.status === "draft" || b.status === "failed") && (
                  <button onClick={() => void sendNow(b.id)} disabled={busy} className="rounded-md border border-input px-3 py-1 text-xs hover:bg-secondary disabled:opacity-60">
                    Send now
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
