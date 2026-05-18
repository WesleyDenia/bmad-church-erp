import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import type {
  FinancialEntryAuditErrorResponse,
  FinancialEntryAuditsResponse,
} from "@/features/finance/financial-entry";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
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

  const { id } = await context.params;
  const response = await callLaravel(`/api/v1/finance/entries/${id}/audits`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
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
            message: "Nao foi possivel concluir a solicitacao agora.",
          }
        : body;

  const nextResponse = NextResponse.json(
    response.ok
      ? (body as FinancialEntryAuditsResponse)
      : (safeBody as FinancialEntryAuditErrorResponse),
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
