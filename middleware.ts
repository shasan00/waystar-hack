import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Edge-runtime gate for the admin portal.
 *
 * Cookie-presence check only — fast, no DB call. The admin layout re-fetches
 * the full session server-side and enforces `role === "admin"`. A forged
 * cookie gets through here but fails the layout check, so this is a perimeter
 * redirect, not the authoritative gate.
 */
export function middleware(req: NextRequest) {
  const cookie = getSessionCookie(req);
  if (!cookie) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
