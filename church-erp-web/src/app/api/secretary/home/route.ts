import { NextResponse } from "next/server.js";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import type {
  SecretaryHomeErrorResponse,
  SecretaryHomeResponse,
} from "@/features/secretaria/secretary-home";
import { callLaravel } from "@/lib/api/client";

const SCOPE_QUERY_PARAMETERS = [
  "church_id",
  "user_id",
  "role",
  "roles",
  "permission",
  "permissions",
  "tenant",
  "tenant_id",
  "scope",
] as const;

function readToken(request: Request): string | null {
  return readSessionTokenFromCookieValue(
    request.headers.get("cookie")?.match(
      new RegExp(`${AUTH_SESSION_COOKIE_NAME}=([^;]+)`),
    )?.[1],
  );
}

function validateSecretaryQuery(url: URL): SecretaryHomeErrorResponse | null {
  for (const parameter of url.searchParams.keys()) {
    return {
      message: "Revise a leitura da secretaria e tente novamente.",
      errors: {
        [parameter]: [
          SCOPE_QUERY_PARAMETERS.includes(parameter as (typeof SCOPE_QUERY_PARAMETERS)[number])
            ? "Este parametro nao pode ser informado pelo navegador."
            : "Este parametro nao e aceito nesta leitura.",
        ],
      },
    };
  }

  return null;
}

function buildValidationErrorBody(body: Record<string, unknown>): SecretaryHomeErrorResponse {
  const response: SecretaryHomeErrorResponse = {
    message: typeof body.message === "string"
      ? body.message
      : "Revise a leitura da secretaria e tente novamente.",
  };

  if (isValidationErrors(body.errors)) {
    response.errors = body.errors;
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

function buildSafeBody(
  status: number,
  body: Record<string, unknown>,
): SecretaryHomeErrorResponse {
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

  if (status === 422) {
    return buildValidationErrorBody(body);
  }

  if (status >= 500) {
    return {
      message: "Nao foi possivel carregar a secretaria agora.",
    };
  }

  return {
    message: "Nao foi possivel carregar a secretaria agora.",
  };
}

export async function GET(request: Request): Promise<Response> {
  const queryError = validateSecretaryQuery(new URL(request.url));

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

  const response = await callLaravel("/api/v1/secretary/home", {
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
      ? (body as SecretaryHomeResponse)
      : buildSafeBody(status, body),
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
