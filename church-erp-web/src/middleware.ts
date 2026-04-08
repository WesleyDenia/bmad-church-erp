import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const protectedPrefixes = [
  "/treasury",
  "/secretaria",
  "/leadership",
  "/communications",
];

export function middleware(request: NextRequest) {
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // Story 1.1 only reserves the server-side guard location for future auth.
  return NextResponse.next();
}

export const config = {
  matcher: ["/treasury/:path*", "/secretaria/:path*", "/leadership/:path*", "/communications/:path*"],
};
