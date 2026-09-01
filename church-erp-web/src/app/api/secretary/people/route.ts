import { NextResponse } from "next/server.js";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import {
  PERSON_SEARCH_ALLOWED_QUERY_PARAMS,
  extractPersonSearchValidationErrors,
  normalizePersonSearchResponse,
  type PersonSearchErrorResponse,
} from "@/features/people/person-search";
import { callLaravel } from "@/lib/api/client";

function readToken(request: Request): string | null {
  return readSessionTokenFromCookieValue(
    request.headers.get("cookie")?.match(
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=([^;]+)`),
    )?.[1],
  );
}

function buildUnauthorizedResponse(): Response {
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

function isAllowedQueryField(
  field: string,
): field is (typeof PERSON_SEARCH_ALLOWED_QUERY_PARAMS)[number] {
  return PERSON_SEARCH_ALLOWED_QUERY_PARAMS.includes(
    field as (typeof PERSON_SEARCH_ALLOWED_QUERY_PARAMS)[number],
  );
}

function buildQueryError(field: string | null, message: string): PersonSearchErrorResponse {
  return {
    message: "Revise os filtros de pessoas e tente novamente.",
    ...(field && isAllowedQueryField(field) ? { errors: {
      [field]: [message],
    } } : {}),
  };
}

function validatePeopleSearchQuery(url: URL): PersonSearchErrorResponse | null {
  for (const key of Array.from(url.searchParams.keys())) {
    if (
      !isAllowedQueryField(key)
      || key.includes("[")
      || key.includes("]")
    ) {
      return buildQueryError(null, "Este parametro nao e aceito nesta busca.");
    }

    if (url.searchParams.getAll(key).length > 1) {
      return buildQueryError(key, "Informe este filtro apenas uma vez.");
    }
  }

  const q = url.searchParams.get("q");

  if (q !== null && q.trim().length > 80) {
    return buildQueryError("q", "Use ate 80 caracteres para a busca.");
  }

  for (const key of PERSON_SEARCH_ALLOWED_QUERY_PARAMS) {
    if (key === "q") {
      continue;
    }

    if (url.searchParams.has(key) && (url.searchParams.get(key) ?? "") === "") {
      return buildQueryError(key, "Este filtro precisa de um valor valido.");
    }
  }

  return null;
}

function buildLaravelQuery(url: URL): string {
  const searchParams = new URLSearchParams();

  for (const key of PERSON_SEARCH_ALLOWED_QUERY_PARAMS) {
    const value = url.searchParams.get(key);

    if (value === null) {
      continue;
    }

    const normalized = key === "q" ? value.trim() : value;

    if (normalized === "" && key === "q") {
      continue;
    }

    searchParams.set(key, normalized);
  }

  const query = searchParams.toString();

  return query === "" ? "" : `?${query}`;
}

function isValidationErrors(value: unknown): value is Record<string, string[]> {
  return !!value
    && typeof value === "object"
    && !Array.isArray(value)
    && Object.values(value).every((messages) =>
      Array.isArray(messages)
      && messages.every((message) => typeof message === "string")
    );
}

function buildValidationErrorBody(body: Record<string, unknown>): PersonSearchErrorResponse {
  const errors = extractPersonSearchValidationErrors(body);

  return {
    message: "Revise os filtros de pessoas e tente novamente.",
    ...(Object.keys(errors).length > 0 ? { errors: Object.fromEntries(
      Object.entries(errors).map(([field, message]) => [field, [message]]),
    ) } : {}),
  };
}

function buildSafeBody(status: number, body: Record<string, unknown>): PersonSearchErrorResponse {
  if (status === 401) {
    return {
      message: "Sessao invalida. Entre novamente.",
    };
  }

  if (status === 403) {
    return {
      message: "Acesso negado para esta area.",
    };
  }

  if (status === 404) {
    return {
      message: "Nao foi possivel carregar as pessoas agora.",
    };
  }

  if (status === 422 && isValidationErrors(body.errors)) {
    return buildValidationErrorBody(body);
  }

  if (status >= 500) {
    return {
      message: "Nao foi possivel carregar as pessoas agora.",
    };
  }

  return {
    message: "Nao foi possivel carregar as pessoas agora.",
  };
}

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const queryError = validatePeopleSearchQuery(url);

  if (queryError) {
    return NextResponse.json(queryError, { status: 422 });
  }

  const token = readToken(request);

  if (!token) {
    return buildUnauthorizedResponse();
  }

  const queryString = buildLaravelQuery(url);
  const response = await callLaravel(`/api/v1/people${queryString}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const { body, status } = await normalizeAuthResponse(response);
  const successBody = response.ok ? normalizePersonSearchResponse(body) : null;
  const nextResponse = NextResponse.json(
    response.ok && successBody !== null
      ? successBody
      : buildSafeBody(status, body),
    { status: response.ok && successBody === null ? 502 : status },
  );

  if (status === 401) {
    nextResponse.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
      ...buildSessionCookieOptions(),
      maxAge: 0,
    });
  }

  return nextResponse;
}
