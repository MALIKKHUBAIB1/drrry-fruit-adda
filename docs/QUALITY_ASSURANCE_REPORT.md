# Quality Assurance and Security Review

## Scope
This review covers the app’s architecture, authentication model, payment flow, admin panel, local DB-backed persistence, and the QA automation added around the existing Next.js stack.

## Architecture summary
- Framework: Next.js 15 App Router with TypeScript
- Persistence: local JSON database in `data/db.json` with custom read/write helpers in `lib/server/db.ts`
- Session auth: custom cookie-based login in `lib/server/auth.ts` and `middleware.ts`
- Admin auth: `requireAdmin()` in `lib/server/admin.ts`
- Payments: Razorpay integration in `app/api/payments/create-order/route.ts` and `app/api/payments/verify/route.ts`
- Public UI: customer pages in `app/` and shopping flow in `app/shop`, `app/cart`, `app/checkout`

## Verified defects and status
1. Unsafe URL validation in `safeUrl()` was fixed in `lib/server/security.ts` and validated by `lib/server/security.test.ts`.
2. Exact expiry boundary in the rate limiter was fixed and covered with a regression test.
3. Default admin password fallback in production was blocked by a guard in `lib/server/db.ts`. The app now refuses to default to `Admin@123` when `NODE_ENV=production` unless `ADMIN_PASSWORD` is set.
4. Admin dev-page credentials were aligned with the real runtime default: `admin@dryfruitadda.in` / `Admin@123`.

## Risks still requiring operational controls
- The app still uses a file-based local JSON database rather than a transactional relational database; this is acceptable for a prototype but not for scale or concurrent write safety.
- Payment verification relies on the server-side Razorpay API and server-side order binding; the sandbox must be configured before production rollout.
- Admin credentials must be injected via environment variables and rotated regularly.
- The app should not expose demo credentials in production builds.

## Recommended next actions
1. Move the data layer to a transactional database with proper indexes and migrations.
2. Add a dedicated staging environment for sandbox payment and webhook verification.
3. Add structured logs, Sentry/OTel integration, and alerting around critical auth and payment endpoints.
4. Run Playwright tests against an isolated local environment and CI runners.
5. Add load tests and capacity review for `/api/orders`, `/api/payments/verify`, and `/api/admin/*` endpoints.

## Current validation status
- Security regression tests: passed
- Browser E2E suite: scaffolded and ready; execution requires a local or CI runner with browser dependencies installed
- k6 load suite: scaffolded and ready; execution requires a local or staging host and `k6` binary
- Secret scan script: added and can be run locally before code review

## Coverage summary
The repository now includes:
- security regression checks
- Playwright journey scaffolding for customer and admin flows
- k6 load smoke test
- secret scan script
- CI quality-gate workflow definition

These cover the highest-risk flows without risking destructive production activity.
