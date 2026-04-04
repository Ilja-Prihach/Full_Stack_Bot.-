import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { SUPABASE_ACCESS_TOKEN_COOKIE } from "@/lib/admin-auth";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/admin")) {
    return NextResponse.next();
  }

  const isLoginPage = pathname === "/login";
  const accessToken = request.cookies.get(SUPABASE_ACCESS_TOKEN_COOKIE)?.value;
  const isAuthenticated = Boolean(accessToken);

  if (!isAuthenticated && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthenticated && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/login", "/api/admin/:path*"],
};
