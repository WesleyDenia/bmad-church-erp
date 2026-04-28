import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
} from "@/features/auth/session";

const protectedPrefixes = [
  "/treasury",
  "/secretaria",
  "/leadership",
  "/communications",
];

async function isSessionValid(request: NextRequest, sessionToken: string): Promise<boolean> {
  const response = await fetch(new URL("/api/auth/me", request.url), {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? `${AUTH_SESSION_COOKIE_NAME}=${sessionToken}`,
    },
    cache: "no-store",
  });

  return response.ok;
}

function redirectToLogin(request: NextRequest, clearCookie: boolean): NextResponse {
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", request.nextUrl.pathname);

  const response = NextResponse.redirect(loginUrl);

  if (clearCookie) {
    response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
      ...buildSessionCookieOptions(),
      maxAge: 0,
    });
  }

  return response;
}

function continueToLoginPage(clearCookie: boolean): NextResponse {
  const response = NextResponse.next();

  if (clearCookie) {
    response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
      ...buildSessionCookieOptions(),
      maxAge: 0,
    });
  }

  return response;
}

export async function proxy(request: NextRequest) {
  const sessionToken = request.cookies.get(AUTH_SESSION_COOKIE_NAME)?.value;
  const isProtectedRoute = protectedPrefixes.some((prefix) =>
    request.nextUrl.pathname.startsWith(prefix),
  );
  const isLoginRoute = request.nextUrl.pathname.startsWith("/login");

  if (!sessionToken) {
    if (isProtectedRoute) {
      return redirectToLogin(request, false);
    }

    return NextResponse.next();
  }

  if (!isProtectedRoute && !isLoginRoute) {
    return NextResponse.next();
  }

  const validSession = await isSessionValid(request, sessionToken);

  if (isLoginRoute && validSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isLoginRoute) {
    return continueToLoginPage(!validSession);
  }

  if (!validSession) {
    return redirectToLogin(request, true);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/treasury/:path*",
    "/secretaria/:path*",
    "/leadership/:path*",
    "/communications/:path*",
  ],
};
