import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import type {
  FinancialEntryErrorResponse,
  FinancialEntryResponse,
  UpdateFinancialEntryPayload,
} from "@/features/finance/financial-entry";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";

function buildInvalidJsonResponse(): Response {
  return NextResponse.json(
    { message: "Envie um JSON valido." },
    { status: 400 },
  );
}

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
      message: "Nao foi possivel concluir a solicitacao agora.",
    };
  }

  return body;
}

async function forwardUpdate(
  request: Request,
  params: Promise<{ id: string }>,
  method: "PUT" | "PATCH",
): Promise<Response> {
  const token = readToken(request);

  if (!token) {
    return NextResponse.json(
      { message: "Sessao invalida. Entre novamente." },
      { status: 401 },
    );
  }

  let requestBody: Partial<UpdateFinancialEntryPayload>;

  try {
    requestBody = (await request.json()) as Partial<UpdateFinancialEntryPayload>;
  } catch {
    return buildInvalidJsonResponse();
  }

  const { id } = await params;
  const payload: UpdateFinancialEntryPayload = {
    entry_type: requestBody.entry_type as UpdateFinancialEntryPayload["entry_type"],
    amount: requestBody.amount ?? "",
    financial_category_id: Number(requestBody.financial_category_id),
    counterparty_id: Number(requestBody.counterparty_id),
    cost_center_name: requestBody.cost_center_name ?? "",
    reason: requestBody.reason ?? "",
    ...(requestBody.resolve_pending_review === true
      ? { resolve_pending_review: true }
      : {}),
  };

  const response = await callLaravel(`/api/v1/finance/entries/${id}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const { body, status } = await normalizeAuthResponse(response);
  const nextResponse = NextResponse.json(
    response.ok
      ? (body as FinancialEntryResponse)
      : (buildSafeBody(status, body) as FinancialEntryErrorResponse),
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

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return forwardUpdate(request, context.params, "PUT");
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return forwardUpdate(request, context.params, "PATCH");
}
