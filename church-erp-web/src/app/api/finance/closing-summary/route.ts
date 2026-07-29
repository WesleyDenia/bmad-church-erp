import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import type {
  FinancialClosingSummary,
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

  if (status === 422) {
    return buildValidationErrorBody(body);
  }

  if (status === 409) {
    return buildConsistencyErrorBody(body);
  }

  return {
    message: "Nao foi possivel carregar o fechamento agora.",
  };
}

function buildValidationErrorBody(
  body: Record<string, unknown>,
): FinancialClosingSummaryErrorResponse {
  const response: FinancialClosingSummaryErrorResponse = {
    message: typeof body.message === "string"
      ? body.message
      : "Revise o periodo do fechamento e tente novamente.",
  };

  if (isValidationErrors(body.errors)) {
    response.errors = body.errors;
  }

  return response;
}

function buildConsistencyErrorBody(
  body: Record<string, unknown>,
): FinancialClosingSummaryErrorResponse {
  const response: FinancialClosingSummaryErrorResponse = {
    message: typeof body.message === "string"
      ? body.message
      : "Nao foi possivel confirmar a consistencia do fechamento.",
  };
  const closingSummary = readClosingSummaryFromErrorBody(body);

  if (closingSummary?.state === "consistency_error") {
    response.data = {
      closing_summary: closingSummary,
    };
  }

  return response;
}

function isValidationErrors(value: unknown): value is Record<string, string[]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  return Object.values(value).every((messages) =>
    Array.isArray(messages)
    && messages.every((message) => typeof message === "string")
  );
}

function readClosingSummaryFromErrorBody(
  body: Record<string, unknown>,
): FinancialClosingSummary | null {
  const data = body.data;

  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return null;
  }

  const closingSummary = (data as Record<string, unknown>).closing_summary;

  return sanitizeFinancialClosingSummary(closingSummary);
}

function sanitizeFinancialClosingSummary(value: unknown): FinancialClosingSummary | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const summary = value as Record<string, unknown>;
  const entryCount = summary.entry_count;

  if (
    (summary.state !== "closing_summary_loaded"
      && summary.state !== "empty_closing_summary"
      && summary.state !== "consistency_error")
    || (summary.period_kind !== "current_operational_week"
      && summary.period_kind !== "custom_period")
    || typeof summary.period_start !== "string"
    || typeof summary.period_end !== "string"
    || typeof summary.total_income !== "string"
    || typeof summary.total_expense !== "string"
    || typeof summary.net_result !== "string"
    || typeof entryCount !== "number"
    || !Number.isInteger(entryCount)
    || summary.calculation_basis !== "financial_entries.created_at"
  ) {
    return null;
  }

  const sanitized: FinancialClosingSummary = {
    state: summary.state,
    period_kind: summary.period_kind,
    period_start: summary.period_start,
    period_end: summary.period_end,
    total_income: summary.total_income,
    total_expense: summary.total_expense,
    net_result: summary.net_result,
    entry_count: entryCount,
    calculation_basis: "financial_entries.created_at",
  };
  const details = sanitizeConsistencyDetails(summary.details);

  if (details) {
    sanitized.details = details;
  }

  return sanitized;
}

function sanitizeConsistencyDetails(value: unknown): FinancialClosingSummary["details"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const details = value as Record<string, unknown>;
  const reconciliation = details.reconciliation;

  if (!reconciliation || typeof reconciliation !== "object" || Array.isArray(reconciliation)) {
    return undefined;
  }

  const statuses = reconciliation as Record<string, unknown>;

  if (
    (statuses.cost_center_status !== "consistent"
      && statuses.cost_center_status !== "inconsistent")
    || (statuses.subtype_status !== "consistent"
      && statuses.subtype_status !== "inconsistent")
  ) {
    return undefined;
  }

  return {
    by_cost_center: [],
    by_subtype: [],
    reconciliation: {
      cost_center_status: statuses.cost_center_status,
      subtype_status: statuses.subtype_status,
    },
  };
}

function buildLaravelPath(request: Request): string {
  const url = new URL(request.url);
  const params = new URLSearchParams();
  const includeDetails = url.searchParams.get("include_details");
  const periodStart = url.searchParams.get("period_start");
  const periodEnd = url.searchParams.get("period_end");

  if (includeDetails !== null) {
    params.set("include_details", includeDetails);
  }

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
