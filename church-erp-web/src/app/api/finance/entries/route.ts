import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import type {
  FinancialEntryErrorResponse,
  FinancialEntryPayload,
  FinancialEntryResponse,
} from "@/features/finance/financial-entry";
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

  if (!token) {
    return NextResponse.json(
      { message: "Sessao invalida. Entre novamente." },
      { status: 401 },
    );
  }

  const requestBody = (await request.json()) as Partial<FinancialEntryPayload>;
  const payload: FinancialEntryPayload = {
    entry_type: requestBody.entry_type as FinancialEntryPayload["entry_type"],
    amount: requestBody.amount ?? "",
    financial_category_id: Number(requestBody.financial_category_id),
    counterparty_id: Number(requestBody.counterparty_id),
    cost_center_name: requestBody.cost_center_name ?? "",
  };
  const response = await callLaravel("/api/v1/finance/entries", {
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
      ? (body as FinancialEntryResponse)
      : (safeBody as FinancialEntryErrorResponse),
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
