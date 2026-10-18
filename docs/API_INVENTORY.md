# API Inventory

## Stack summary
- Framework: Next.js 15 App Router with TypeScript
- Runtime: Node.js / server-side route handlers
- Persistence: local JSON-backed store in `data/db.json` through `lib/server/db.ts`
- Auth: custom cookie-based session model using `dfa_session`, `lib/server/auth.ts`, and `lib/server/crypto.ts`
- Payment: Razorpay integration via `app/api/payments/create-order/route.ts` and `app/api/payments/verify/route.ts`
- Admin gating: `middleware.ts` + `lib/server/admin.ts`
- GraphQL: not present in the repository
- Webhooks: not present as separate endpoints; payment verification is handled in the app route layer
- Background jobs: no standalone job processor detected; `publish()` references appear in payment/order code but no scheduler was found

## Authentication model
- Session cookie name: `dfa_session`
- Session storage: in-memory-like JSON DB (`db.sessions`) with expiry timestamps
- Password hashing: `scryptSync` keccak-style custom hashing via `lib/server/crypto.ts`
- Admin access: enforced by `requireAdmin()` and middleware redirect for `/admin/*`
- Public routes: product, category, home, search, CMS pages, and most public GETs
- Protected routes: auth, account, cart, wishlist, orders, address management, reviews, admin APIs, payments

## REST endpoints discovered

| Route | Method | Auth | Role | Notes |
| --- | --- | --- | --- | --- |
| `/api/products` | GET | Public | N/A | product listing, search, filtering, sorting |
| `/api/products/[slug]` | GET | Public | N/A | single product detail |
| `/api/categories` | GET | Public | N/A | category list |
| `/api/hampers` | GET | Public | N/A | hamper catalog |
| `/api/coupons` | GET | Public | N/A | active coupon list |
| `/api/pincode` | GET | Public | N/A | PIN validation/serviceability |
| `/api/settings` | GET | Public | N/A | site promo/settings |
| `/api/reviews` | GET | Public | N/A | review listing and summary |
| `/api/reviews/featured` | GET | Public | N/A | featured review list |
| `/api/contact` | POST | Public | N/A | contact form |
| `/api/newsletter` | POST | Public | N/A | newsletter subscribe |
| `/api/newsletter` | GET | Authenticated | User | newsletter listing |
| `/api/newsletter` | DELETE | Authenticated | User | unsubscribe |
| `/api/auth/register` | POST | Public | N/A | register + auto-session |
| `/api/auth/login` | POST | Public | N/A | login + auto-session |
| `/api/auth/logout` | POST | Authenticated | User | session invalidation |
| `/api/auth/me` | GET | Authenticated | User | current user |
| `/api/auth/me` | PATCH | Authenticated | User | profile update |
| `/api/auth/change-password` | POST | Authenticated | User | password change |
| `/api/account` | DELETE | Authenticated | User | self-delete account |
| `/api/addresses` | GET | Authenticated | User | list addresses |
| `/api/addresses` | POST | Authenticated | User | create address |
| `/api/addresses/[id]` | PUT | Authenticated | User | update own address |
| `/api/addresses/[id]` | DELETE | Authenticated | User | delete own address |
| `/api/cart` | GET | Authenticated | User | cart view |
| `/api/cart` | PUT | Authenticated | User | sync cart |
| `/api/cart` | DELETE | Authenticated | User | clear cart |
| `/api/wishlist` | GET | Authenticated | User | wishlist view |
| `/api/wishlist` | POST | Authenticated | User | toggle item |
| `/api/wishlist` | PUT | Authenticated | User | sync list |
| `/api/wishlist` | DELETE | Authenticated | User | remove item |
| `/api/orders` | GET | Authenticated | User | own orders |
| `/api/orders` | POST | Authenticated | User | place order |
| `/api/orders/[id]` | GET | Authenticated | User | own order detail |
| `/api/orders/[id]/cancel` | POST | Authenticated | User | cancel own order |
| `/api/orders/stream` | GET | Public / session-aware | N/A | order stream endpoint |
| `/api/track` | POST | Optional session or email | User/guest | track order by ID/email |
| `/api/track` | GET | Optional session or email | User/guest | track status lookup |
| `/api/payments/create-order` | POST | Authenticated | User | create Razorpay payment order |
| `/api/payments/create-order` | PUT | Admin | Admin | refund flow (implemented in same route file) |
| `/api/payments/verify` | POST | Authenticated | User | server-side payment verification |
| `/api/admin/stats` | GET | Authenticated | Admin | summary stats |
| `/api/admin/orders` | GET | Authenticated | Admin | order management |
| `/api/admin/orders/[id]` | PATCH | Authenticated | Admin | update order status |
| `/api/admin/users` | GET | Authenticated | Admin | user lookup |
| `/api/admin/users` | PATCH | Authenticated | Admin | grant/revoke admin |
| `/api/admin/users` | DELETE | Authenticated | Admin | delete user |
| `/api/admin/products` | GET | Authenticated | Admin | product listing |
| `/api/admin/products` | POST | Authenticated | Admin | create product |
| `/api/admin/products` | PUT | Authenticated | Admin | update product |
| `/api/admin/products` | DELETE | Authenticated | Admin | delete product |
| `/api/admin/categories` | GET | Authenticated | Admin | category listing |
| `/api/admin/categories` | POST | Authenticated | Admin | create category |
| `/api/admin/categories` | PUT | Authenticated | Admin | update category |
| `/api/admin/categories` | DELETE | Authenticated | Admin | delete category |
| `/api/admin/coupons` | GET | Authenticated | Admin | list coupons |
| `/api/admin/coupons` | POST | Authenticated | Admin | create coupon |
| `/api/admin/coupons` | PUT | Authenticated | Admin | update coupon |
| `/api/admin/coupons` | DELETE | Authenticated | Admin | delete coupon |
| `/api/admin/hampers` | GET | Authenticated | Admin | hamper list |
| `/api/admin/hampers` | POST | Authenticated | Admin | create hamper |
| `/api/admin/hampers` | PUT | Authenticated | Admin | update hamper |
| `/api/admin/hampers` | DELETE | Authenticated | Admin | delete hamper |
| `/api/admin/pincodes` | GET | Authenticated | Admin | pin code list |
| `/api/admin/pincodes` | POST | Authenticated | Admin | create pin code |
| `/api/admin/pincodes` | DELETE | Authenticated | Admin | delete pin |
| `/api/admin/pincodes/restore` | POST | Authenticated | Admin | restore pin |
| `/api/admin/contacts` | GET | Authenticated | Admin | list contact form submissions |
| `/api/admin/contacts` | DELETE | Authenticated | Admin | delete contact entry |
| `/api/admin/reviews` | GET | Authenticated | Admin | review moderation | 
| `/api/admin/reviews` | DELETE | Authenticated | Admin | delete review |
| `/api/admin/stats` | GET | Authenticated | Admin | sales overview |

## Endpoint count summary
- Public routes: 18+
- Authenticated customer routes: 20+
- Admin routes: 25+
- Total discovered route handlers: 75+ exported methods
- No GraphQL schema or server action layer detected

## Initial risk summary
- Custom security layer already exists for CORS, rate limiting, and CSP; this is a positive baseline.
- There are still review points around default admin credentials and live external service config.
- Payment verification and order binding have been strengthened in the payment routes, but live Razorpay behavior still requires sandbox/manual verification.
