import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/server/auth";

// Admin routes protect karo: /admin/login allow, baaki sab admin-only.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Security headers sab jagah
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(self)");
  res.headers.set("Strict-Transport-Security", "max-age=63072000; includeSubDomains; preload");

  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "frame-src https://api.razorpay.com https://checkout.razorpay.com",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  res.headers.set("Content-Security-Policy", csp);

  // CSRF lite
  const method = req.method.toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const origin = req.headers.get("origin");
    const host = req.headers.get("host");
    if (origin) {
      try {
        if (new URL(origin).host !== host) {
          return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid origin." }, { status: 403 });
      }
    }
  }

  if (pathname.startsWith("/admin")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");

    // /admin/login public hai
    if (pathname === "/admin/login" || pathname.startsWith("/admin/login/")) {
      return res;
    }

    // Baaki /admin/* ke liye session + admin check (cookie se)
    const token = req.cookies.get("dfa_session")?.value;
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("redirect", pathname);
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
