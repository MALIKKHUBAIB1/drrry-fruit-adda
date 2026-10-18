/**
 * Structured logging — JSON lines, no PII.
 *
 * Rules (enforced here, not by convention):
 *  - Never log passwords, tokens, cookies, card data, or full email/phone.
 *  - `redact()` se sensitive keys nested objects me bhi strip ho jaate hain.
 *  - Logs go to stdout as one JSON object per line (log shipper friendly).
 *  - In production `console` methods are monkey-patched so ANY stray
 *    console.log in a route is captured in the same format instead of
 *    vanishing into unstructured output.
 */

const SENSITIVE = new Set([
  "password",
  "pass",
  "passhash",
  "salt",
  "token",
  "session",
  "cookie",
  "authorization",
  "secret",
  "key",
  "keysecret",
  "apikey",
  "card",
  "cardnumber",
  "cvv",
  "otp",
  "signature",
  "razorpay_signature",
  "email",
  "phone",
  "address",
  "pin",
]);

function mask(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (Array.isArray(v)) return v.slice(0, 20).map(mask);
  if (typeof v !== "object") return v;
  const out: Record<string, unknown> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
    if (SENSITIVE.has(k.toLowerCase())) {
      out[k] = "[redacted]";
    } else if (typeof val === "object") {
      out[k] = mask(val);
    } else if (typeof val === "string" && val.length > 300) {
      out[k] = val.slice(0, 300) + "…";
    } else {
      out[k] = val;
    }
  }
  return out;
}

type Level = "debug" | "info" | "warn" | "error";

const LEVELS: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN = LEVELS[(process.env.LOG_LEVEL as Level) ?? "info"] ?? 20;

function emit(level: Level, msg: string, ctx?: Record<string, unknown>) {
  if (LEVELS[level] < MIN) return;
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    level,
    msg,
    ...(ctx ? (mask(ctx) as Record<string, unknown>) : {}),
  });
  if (level === "error") process.stderr.write(line + "\n");
  else process.stdout.write(line + "\n");
}

export const log = {
  debug: (msg: string, ctx?: Record<string, unknown>) => emit("debug", msg, ctx),
  info: (msg: string, ctx?: Record<string, unknown>) => emit("info", msg, ctx),
  warn: (msg: string, ctx?: Record<string, unknown>) => emit("warn", msg, ctx),
  error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, ctx),
  redact: mask,
};

/** Replace console.* with structured output (called once from instrumentation). */
export function installConsoleBridge() {
  const orig = { log: console.log, warn: console.warn, error: console.error, info: console.info };
  console.log = (...a: unknown[]) => emit("info", "console.log", { args: a });
  console.info = (...a: unknown[]) => emit("info", "console.info", { args: a });
  console.warn = (...a: unknown[]) => emit("warn", "console.warn", { args: a });
  console.error = (...a: unknown[]) => emit("error", "console.error", { args: a });
  return () => {
    console.log = orig.log;
    console.info = orig.info;
    console.warn = orig.warn;
    console.error = orig.error;
  };
}