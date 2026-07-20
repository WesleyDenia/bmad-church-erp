import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import type {
  FinancialClosingSummaryErrorResponse,
  FinancialClosingSummaryResponse,
} from "@/features/finance/closing-summary";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";

function readToken(request: Request): string | null {
  return readSessionTokenFromCookieValue(
    request.headers.get("cookie")?.match(
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=([^;]+)`),
    )?.[1],
  );
}

function buildSafeBody(
  status: number,
  body: Record<string, unknown>,
): Record<string, unknown> {
  if (status === 401 || status === 403) {
    return {
      message:
        typeof body.message === "string"
          ? body.message
          : "Acesso negado para esta area.",
    };
  }

  if (status >= 500) {
    return {
      message: "Server error",
    };
  }

  return body;
}

function buildLaravelPath(request: Request): string {
  const url = new URL(request.url);
  const params = new URLSearchParams();
  const periodStart = url.searchParams.get("period_start");
  const periodEnd = url.searchParams.get("period_end");

  if (periodStart !== null) {
    params.set("period_start", periodStart);
  }

  if (periodEnd !== null) {
    params.set("period_end", periodEnd);
  }

  const query = params.toString();

  return query === ""
    ? "/api/v1/finance/closing-summary"
    : `/api/v1/finance/closing-summary?${query}`;
}

export async function GET(request: Request): Promise<Response> {
  const token = readToken(request);

  if (!token) {
    return NextResponse.json(
      { message: "Sessao invalida. Entre novamente." },
      { status: 401 },
    );
  }

  const response = await callLaravel(buildLaravelPath(request), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const { body, status } = await normalizeAuthResponse(response);
  const nextResponse = NextResponse.json(
    response.ok
      ? (body as FinancialClosingSummaryResponse)
      : (buildSafeBody(status, body) as FinancialClosingSummaryErrorResponse),
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
