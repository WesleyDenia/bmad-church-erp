import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import type { FinancialCategoriesResponse } from "@/features/finance/financial-entry";
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

  const response = await callLaravel("/api/v1/finance/categories", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { body, status } = await normalizeAuthResponse(response);
  const safeBody =
    status === 401 || status === 403
      ? {
          message:
            typeof body.message === "string"
              ? body.message
              : "Acesso negado para esta area.",
        }
      : status >= 500
        ? {
            message: "Server error",
          }
      : body;

  const nextResponse = NextResponse.json(
    response.ok ? (body as FinancialCategoriesResponse) : safeBody,
    { status },
  );

  if (status === 401) {
    nextResponse.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
      ...buildSessionCookieOptions(),
      maxAge: 0,
    });
  }

  return nextResponse;
}
