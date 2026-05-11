import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import type {
  CreateFinancialCounterpartyPayload,
  FinancialCounterpartiesResponse,
  FinancialCounterpartyErrorResponse,
  FinancialCounterpartyResponse,
} from "@/features/finance/counterparty";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";

function getSessionToken(request: Request): string | null {
  return readSessionTokenFromCookieValue(
    request.headers.get("cookie")?.match(
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=([^;]+)`),
    )?.[1],
  );
}

function buildUnauthorizedResponse(): Response {
  return NextResponse.json(
    { message: "Sessao invalida. Entre novamente." },
    { status: 401 },
  );
}

export async function GET(request: Request): Promise<Response> {
  const token = getSessionToken(request);

  if (!token) {
    return buildUnauthorizedResponse();
  }

  const response = await callLaravel("/api/v1/finance/counterparties", {
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
    response.ok ? (body as FinancialCounterpartiesResponse) : safeBody,
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

export async function POST(request: Request): Promise<Response> {
  const token = getSessionToken(request);

  if (!token) {
    return buildUnauthorizedResponse();
  }

  const requestBody = (await request.json()) as Partial<CreateFinancialCounterpartyPayload>;
  const payload: CreateFinancialCounterpartyPayload = {
    name: requestBody.name ?? "",
  };

  const response = await callLaravel("/api/v1/finance/counterparties", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
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
    response.ok
      ? (body as FinancialCounterpartyResponse)
      : (safeBody as FinancialCounterpartyErrorResponse),
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
