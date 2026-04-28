import { NextResponse } from "next/server";
import { callLaravel } from "@/lib/api/client";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import type { AuthenticatedSessionResponse } from "@/features/auth/session-types";
import { normalizeAuthResponse } from "@/features/auth/auth-response";

export async function GET(request: Request): Promise<Response> {
  const token = readSessionTokenFromCookieValue(
    request.headers.get("cookie")?.match(
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=([^;]+)`),
    )?.[1],
  );

  if (!token) {
    return NextResponse.json(
      { message: "Sessao invalida. Entre novamente." },
      { status: 401 },
    );
  }

  const response = await callLaravel("/api/v1/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { body, status } = await normalizeAuthResponse(response);

  if (!response.ok) {
    const nextResponse = NextResponse.json(body, { status });
    nextResponse.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
      ...buildSessionCookieOptions(),
      maxAge: 0,
    });

    return nextResponse;
  }

  return NextResponse.json(body as AuthenticatedSessionResponse, { status });
}
