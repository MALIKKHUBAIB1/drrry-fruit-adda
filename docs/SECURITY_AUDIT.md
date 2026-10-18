# Security Audit Report

## Scope
This review covers the application’s route handlers, custom server auth, middleware, validation helpers, payment flow, and admin protections.

## Executive summary
The project already contains several good mitigations:
- same-origin enforcement for write APIs
- cookie-based session validation and expiry checks
- admin middleware gating for `/admin/*`
- rate limiting on sensitive routes
- CSP and security headers in `middleware.ts`
- server-side payment validation, amount and order binding checks in payment verification

However, there are still a few operational and logic issues to address or review before production hardening.

## Confirmed findings

### DFA-SEC-001 — Dangerous URL validation bypass
- Affected file(s): `lib/server/security.ts`
- Category: Input validation / unsafe URL handling
- Severity: High
- Status: Fixed

Reproduction path:
1. Pass `javascript:alert(1)` to `safeUrl()`.
2. Pass `//evil.example` to `safeUrl()`.
3. Observe that the unsafe value was accepted before the fix.

Expected behavior:
- return an empty string for dangerous schemes or protocol-relative URLs

Actual behavior before fix:
- the function accepted the unsafe values and returned them unchanged or as relative paths

Evidence:
- regression test added in `lib/server/security.test.ts`
- fix implemented in `lib/server/security.ts`

Business impact:
- could enable unsafe navigation or malicious redirect behavior in downstream code if user-controlled URLs are used in the UI or API layer

Recommended fix:
- reject javascript:, data:, vbscript:, and protocol-relative URLs before accepting any URL value

Regression test reference:
- `lib/server/security.test.ts` — `safeUrl` suite

---

### DFA-SEC-002 — Rate limit expiry boundary bug
- Affected file(s): `lib/server/security.ts`
- Category: Abuse prevention / rate limiting
- Severity: Medium
- Status: Fixed

Reproduction path:
1. Create a rate-limit bucket with a fixed `Date.now()` value.
2. Trigger within the same window.
3. Advance time to exactly the expiry boundary.
4. Observe that the previous logic did not reset correctly at the boundary.

Expected behavior:
- when `resetAt <= now`, reset count and allow a new window

Actual behavior before fix:
- the limiter only reset when `resetAt < now`, which meant the boundary case stayed in the old bucket

Evidence:
- regression test in `lib/server/security.test.ts`

Business impact:
- incorrect throttling at exact time boundaries can lead to inconsistent abuse prevention and user lockouts

Recommended fix:
- use a strict boundary check with `<=` to expire at the exact time window endpoint

Regression test reference:
- `lib/server/security.test.ts` — `rateLimit` suite

---

### DFA-SEC-003 — Default admin credential risk
- Affected file(s): `lib/server/db.ts`
- Category: Broken authentication / insecure default credential
- Severity: High
- Status: Manual review required

Evidence:
- `ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin@123"`

Reproduction steps:
1. Run the app without `ADMIN_PASSWORD` set.
2. The default value is used.

Expected behavior:
- no weak fallback credential should be present in production

Actual behavior:
- a known default password is used unless the environment overrides it

Business impact:
- if deployed without a secure environment variable, an attacker can guess or brute-force the admin login

Recommended fix:
- require `ADMIN_PASSWORD` and `ADMIN_EMAIL` to be set in production; fail fast when absent
- rotate and document secure admin credentials in `.env.example`
- do not ship a known default password in source control

---

## Additional positive findings
- `sameOrigin` checks are present on sensitive write endpoints.
- `middleware.ts` adds CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, and HSTS headers.
- server-side Razorpay signature verification is used in payment verification.
- order/payment amount and order binding checks are enforced server-side.
- admin routes enforce `requireAdmin()` and middleware redirect behavior.

## Notable manual review items
- Real payment provider keys and secrets must be supplied through secure environment management.
- Admin credential setup must be reviewed in deployment.
- Live Razorpay verification and refunds should be validated in a sandbox environment before production use.
- No central CI or test pipeline was present at the start; a lightweight Node test runner was added to cover the key flows.

## Remediation priority
1. Remove default admin credential fallback
2. Review deployment secrets and environment configuration
3. Continue regression testing on auth, admin, and payment flows
4. Validate live sandbox payment flows before production release
