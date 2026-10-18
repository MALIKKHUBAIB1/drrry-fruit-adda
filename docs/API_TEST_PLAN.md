# API Test Plan

## Scope and approach
This plan covers the route handlers implemented in the project, with emphasis on the actual behavior present in the repository rather than assumed e-commerce functionality.

The project exposes a JSON-backed Next.js API surface with custom session auth and admin guards. The tests below are designed to validate:
- positive flows
- negative inputs and malformed payloads
- authorization boundaries
- rate limiting and abuse prevention
- payment and order integrity
- admin-only access control

## Test strategy

### 1. Unit and helper validation
- `lib/server/security` sanitization and validation helpers
- `rateLimit` expiry boundary
- `safeUrl` dangerous URL rejection

### 2. Auth and session testing
- register with valid/invalid payloads
- duplicate email prevention
- login failure, password failure, and lockout behavior
- cookie-based auth enforcement
- logout invalidates active session
- profile update and self-service deletion

### 3. Customer API module testing
- products, categories, cart, wishlist, addresses, reviews, orders, track
- validation of required fields, empty strings, null values, and wrong types
- wrong ownership protection
- guest handling and login requirements

### 4. Payment and order integrity tests
- order creation with server-side totals
- payment signature mismatch rejection
- payment amount mismatch rejection
- cross-order reuse prevention
- duplicate payment replay prevention
- admin refund path checks

### 5. Admin API testing
- non-admin cannot access `/api/admin/*`
- admin can list users, products, orders, coupons, and contacts
- admin cannot revoke their own admin state or delete their own user account
- permission escalation tests beyond normal customer privileges

### 6. Security regression suite
- XSS payloads in text fields
- dangerous URL checks
- IDOR attempt on another user’s orders or addresses
- malformed JSON and oversized request body rejection
- origin mismatch rejection for write methods

## Endpoint coverage by module

### Authentication
- `/api/auth/register` — POST
- `/api/auth/login` — POST
- `/api/auth/logout` — POST
- `/api/auth/me` — GET/PATCH
- `/api/auth/change-password` — POST

### Customer account and profile
- `/api/account` — DELETE
- `/api/addresses` — GET/POST
- `/api/addresses/[id]` — PUT/DELETE

### Catalog and storefront
- `/api/products` — GET
- `/api/products/[slug]` — GET
- `/api/categories` — GET
- `/api/hampers` — GET
- `/api/settings` — GET
- `/api/reviews` — GET/POST/DELETE
- `/api/reviews/featured` — GET

### Order and checkout
- `/api/cart` — GET/PUT/DELETE
- `/api/wishlist` — GET/POST/PUT/DELETE
- `/api/orders` — GET/POST
- `/api/orders/[id]` — GET
- `/api/orders/[id]/cancel` — POST
- `/api/payments/create-order` — POST/PUT
- `/api/payments/verify` — POST
- `/api/track` — GET/POST
- `/api/pincode` — GET

### Admin
- `/api/admin/users` — GET/PATCH/DELETE
- `/api/admin/products` — GET/POST/PUT/DELETE
- `/api/admin/categories` — GET/POST/PUT/DELETE
- `/api/admin/coupons` — GET/POST/PUT/DELETE
- `/api/admin/orders` — GET
- `/api/admin/orders/[id]` — PATCH
- `/api/admin/stats` — GET
- `/api/admin/contacts` — GET/DELETE
- `/api/admin/reviews` — GET/DELETE
- `/api/admin/pincodes` — GET/POST/DELETE
- `/api/admin/pincodes/restore` — POST
- `/api/admin/hampers` — GET/POST/PUT/DELETE

## Risk-based execution order
1. Authentication and session flows
2. Ownership and authorization
3. Payment verification and order integrity
4. Admin access protection
5. Input validation and injection payloads
6. Rate-limiting and abuse scenarios
7. Documentation and reporting

## Test execution notes
- Tests use the repo-local JSON DB and are isolated through snapshot/restore patterns.
- External services like Razorpay must be treated as sandbox-only and verified via mocked or deterministic request patterns.
- Live cloud or production systems were not touched.

## Coverage status
- Automated and executed: core auth, catalog, cart, wishlist, order, admin, and security-helper flows
- Intentionally not executed live: real Razorpay transactions and any production-only external APIs
- Manual review required: operational secrets, real admin credential setup, and production-grade payment webhook enforcement
