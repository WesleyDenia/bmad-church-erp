import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";

export async function POST(request: Request): Promise<Response> {
  const token = readSessionTokenFromCookieValue(
    request.headers.get("cookie")?.match(
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=([^;]+)`),
    )?.[1],
  );

  if (token) {
    try {
      await callLaravel("/api/v1/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // The local session must end even when the upstream API is unavailable.
    }
  }

  const nextResponse = NextResponse.json(
    {
      message: "Sessao encerrada com sucesso.",
    },
    { status: 200 },
  );

  nextResponse.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
    ...buildSessionCookieOptions(),
    maxAge: 0,
  });

  return nextResponse;
}
