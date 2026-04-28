import { NextResponse } from "next/server";
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
    await callLaravel("/api/v1/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
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
