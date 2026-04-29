import type { NextRequest } from "next/server.js";
import { NextResponse } from "next/server.js";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
} from "@/features/auth/session";
import {
  buildAccessDeniedPath,
  getRouteAccessDecision,
} from "@/features/app-shell/navigation-policy.js";

const protectedPrefixes = [
  "/treasury",
  "/secretaria",
  "/leadership",
  "/communications",
];

async function readSessionContext(
  request: NextRequest,
  sessionToken: string,
): Promise<{ roles: string[]; valid: boolean }> {
  const response = await fetch(new URL("/api/auth/me", request.url), {
    method: "GET",
    headers: {
      cookie: request.headers.get("cookie") ?? `${AUTH_SESSION_COOKIE_NAME}=${sessionToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return {
      roles: [],
      valid: false,
    };
  }

  try {
    const body = (await response.json()) as {
      data?: {
        role?: string;
        roles?: string[];
      };
    };

    return {
      roles:
        Array.isArray(body.data?.roles) && body.data?.roles.length > 0
          ? body.data.roles
          : body.data?.role
            ? [body.data.role]
            : [],
      valid: true,
    };
  } catch {
    return {
      roles: [],
      valid: false,
    };
  }
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

  const sessionContext = await readSessionContext(request, sessionToken);
  const validSession = sessionContext.valid;

  if (isLoginRoute && validSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isLoginRoute) {
    return continueToLoginPage(!validSession);
  }

  if (!validSession) {
    return redirectToLogin(request, true);
  }

  const areaDecision = getRouteAccessDecision(sessionContext.roles, request.nextUrl.pathname);

  if (isProtectedRoute && !areaDecision.allowed) {
    return NextResponse.redirect(
      new URL(buildAccessDeniedPath(areaDecision.area, request.nextUrl.pathname), request.url),
    );
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
