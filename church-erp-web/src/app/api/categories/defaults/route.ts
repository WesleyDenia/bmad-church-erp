import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import type { InitialCategoryDefaultsResponse } from "@/features/categories/defaults";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";

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

  const response = await callLaravel("/api/v1/categories/defaults", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { body, status } = await normalizeAuthResponse(response);

  if (!response.ok) {
    const safeBody =
      status === 401
        ? {
            message:
              typeof body.message === "string"
                ? body.message
                : "Sessao invalida. Entre novamente.",
          }
        : body;
    const nextResponse = NextResponse.json(safeBody, { status });

    if (status === 401) {
      nextResponse.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
        ...buildSessionCookieOptions(),
        maxAge: 0,
      });
    }

    return nextResponse;
  }

  return NextResponse.json(body as InitialCategoryDefaultsResponse, { status });
}
