// Secret detection — scans tracked source for committed credentials.
// Fails (exit 1) when a high-confidence secret pattern is found.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const SKIP = new Set(["node_modules", ".next", ".git", "test-results", "playwright-report", "data"]);
const EXT = new Set([".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".yml", ".yaml", ".env"]);

// pattern -> severity
const RULES = [
  [/\brzp_live_[A-Za-z0-9]{10,}/, "CRITICAL", "Razorpay LIVE key"],
  [/\bAKIA[0-9A-Z]{16}\b/, "CRITICAL", "AWS access key id"],
  [/\bghp_[A-Za-z0-9]{36}\b/, "CRITICAL", "GitHub token"],
  [/\bsk_live_[A-Za-z0-9]{16,}/, "CRITICAL", "Stripe live secret"],
  [/\bAIza[0-9A-Za-z\-_]{35}\b/, "CRITICAL", "Google API key"],
  [/(?:RAZORPAY_KEY_SECRET|ADMIN_PASSWORD|SESSION_SECRET|DATABASE_URL)\s*[:=]\s*["'][^"']{12,}["']/, "CRITICAL", "hardcoded secret literal"],
  [/-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/, "CRITICAL", "private key"],
];

function walk(dir, out = []) {
  for (const e of readdirSync(dir)) {
    if (SKIP.has(e) || e.startsWith(".env")) continue;
    const p = join(dir, e);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (EXT.has(extname(e)) || e.startsWith(".env")) out.push(p);
  }
  return out;
}

const findings = [];
for (const file of walk(process.cwd())) {
  const text = readFileSync(file, "utf8");
  text.split("\n").forEach((line, i) => {
    for (const [re, sev, name] of RULES) {
      if (re.test(line)) {
        findings.push({ file, line: i + 1, sev, name });
      }
    }
  });
}

if (!findings.length) {
  console.log("secret-scan: PASS — no committed secrets detected");
  process.exit(0);
}
for (const f of findings) console.log(`${f.sev}  ${f.file}:${f.line}  ${f.name}`);
console.log(`\nsecret-scan: FAIL — ${findings.length} finding(s)`);
process.exit(1);
