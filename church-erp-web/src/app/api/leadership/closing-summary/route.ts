import { NextResponse } from "next/server.js";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import type {
  FinancialClosingSummary,
  FinancialClosingSummaryErrorResponse,
  FinancialClosingSummaryResponse,
} from "@/features/finance/closing-summary";
import { callLaravel } from "@/lib/api/client";

const UTC_TIMESTAMP_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?Z$/;
const MAX_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;
const ALLOWED_QUERY_PARAMETERS = [
  "include_details",
  "period_start",
  "period_end",
] as const;
const SCOPE_QUERY_PARAMETERS = [
  "church_id",
  "user_id",
  "role",
  "roles",
  "permission",
  "permissions",
  "tenant",
  "tenant_id",
] as const;

function readToken(request: Request): string | null {
  return readSessionTokenFromCookieValue(
    request.headers.get("cookie")?.match(
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=([^;]+)`),
    )?.[1],
  );
}

function validationError(field: string, message: string): FinancialClosingSummaryErrorResponse {
  return {
    message: "Revise o periodo da leitura e tente novamente.",
    errors: {
      [field]: [message],
    },
  };
}

function parseUtcTimestamp(value: string): Date | null {
  const match = UTC_TIMESTAMP_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue, microsecondValue] = match;
  const year = Number(yearValue);
  const month = Number(monthValue);
  const day = Number(dayValue);
  const hour = Number(hourValue);
  const minute = Number(minuteValue);
  const second = Number(secondValue);
  const millisecond = Number(`${microsecondValue ?? ""}000`.slice(0, 3));

  if (
    !Number.isInteger(year)
    || !Number.isInteger(month)
    || !Number.isInteger(day)
    || !Number.isInteger(hour)
    || !Number.isInteger(minute)
    || !Number.isInteger(second)
    || month < 1
    || month > 12
    || hour > 23
    || minute > 59
    || second > 59
  ) {
    return null;
  }

  const parsed = new Date(Date.UTC(year, month - 1, day, hour, minute, second, millisecond));

  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
    || parsed.getUTCHours() !== hour
    || parsed.getUTCMinutes() !== minute
    || parsed.getUTCSeconds() !== second
  ) {
    return null;
  }

  return parsed;
}

function validateLeadershipQuery(url: URL): FinancialClosingSummaryErrorResponse | null {
  for (const parameter of url.searchParams.keys()) {
    if (!ALLOWED_QUERY_PARAMETERS.includes(parameter as (typeof ALLOWED_QUERY_PARAMETERS)[number])) {
      return validationError(
        parameter,
        SCOPE_QUERY_PARAMETERS.includes(parameter as (typeof SCOPE_QUERY_PARAMETERS)[number])
          ? "Este parametro nao pode ser informado pelo navegador."
          : "Este parametro nao e aceito nesta leitura.",
      );
    }
  }

  const includeDetails = url.searchParams.get("include_details");
  const periodStart = url.searchParams.get("period_start");
  const periodEnd = url.searchParams.get("period_end");
  const hasStart = periodStart !== null && periodStart !== "";
  const hasEnd = periodEnd !== null && periodEnd !== "";

  if (
    includeDetails !== null
    && !["true", "false", "1", "0"].includes(includeDetails)
  ) {
    return validationError("include_details", "Informe include_details como true ou false.");
  }

  if (hasStart !== hasEnd) {
    return validationError(
      hasStart ? "period_end" : "period_start",
      "Informe inicio e fim do periodo juntos.",
    );
  }

  if (!hasStart && !hasEnd) {
    return null;
  }

  const parsedStart = periodStart ? parseUtcTimestamp(periodStart) : null;
  const parsedEnd = periodEnd ? parseUtcTimestamp(periodEnd) : null;

  if (!parsedStart) {
    return validationError(
      "period_start",
      "Informe um timestamp UTC valido para o inicio do periodo.",
    );
  }

  if (!parsedEnd) {
    return validationError(
      "period_end",
      "Informe um timestamp UTC valido para o fim do periodo.",
    );
  }

  if (parsedStart.getTime() > parsedEnd.getTime()) {
    return validationError("period_start", "O inicio do periodo deve ser anterior ou igual ao fim.");
  }

  const now = new Date();
  const oldestAllowed = new Date(now);
  oldestAllowed.setUTCMonth(oldestAllowed.getUTCMonth() - 12);

  if (parsedStart.getTime() > now.getTime() || parsedEnd.getTime() > now.getTime()) {
    return validationError("period_end", "O periodo de conferencia nao pode estar no futuro.");
  }

  if (parsedEnd.getTime() - parsedStart.getTime() > MAX_WINDOW_MS) {
    return validationError(
      "period_end",
      "O periodo de conferencia pode ter no maximo 31 dias corridos.",
    );
  }

  if (parsedStart.getTime() < oldestAllowed.getTime()) {
    return validationError(
      "period_start",
      "O periodo de conferencia pode voltar no maximo 12 meses.",
    );
  }

  return null;
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
    ? "/api/v1/leadership/closing-summary"
    : `/api/v1/leadership/closing-summary?${query}`;
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
    message: "Nao foi possivel carregar a leitura da lideranca agora.",
  };
}

function buildValidationErrorBody(
  body: Record<string, unknown>,
): FinancialClosingSummaryErrorResponse {
  const response: FinancialClosingSummaryErrorResponse = {
    message: typeof body.message === "string"
      ? body.message
      : "Revise o periodo da leitura e tente novamente.",
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

export async function GET(request: Request): Promise<Response> {
  const queryError = validateLeadershipQuery(new URL(request.url));

  if (queryError) {
    return NextResponse.json(queryError, { status: 422 });
  }

  const token = readToken(request);

  if (!token) {
    const response = NextResponse.json(
      { message: "Sessao invalida. Entre novamente." },
      { status: 401 },
    );

    response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
      ...buildSessionCookieOptions(),
      maxAge: 0,
    });

    return response;
  }

  const response = await callLaravel(buildLaravelPath(request), {
    method: "GET",
    cache: "no-store",
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
