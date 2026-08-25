import { NextResponse } from "next/server.js";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import type {
  VisitorErrorResponse,
  VisitorPayload,
  VisitorResponse,
} from "@/features/people/visitor";
import { VISITOR_PAYLOAD_ALLOWLIST, readVisitor } from "@/features/people/visitor";
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

function buildInvalidJsonResponse(): Response {
  return NextResponse.json(
    { message: "Envie um JSON valido." },
    { status: 400 },
  );
}

function validateSameOriginMutation(request: Request): VisitorErrorResponse | null {
  const origin = request.headers.get("origin");

  if (!origin) {
    return {
      message: "Acesso negado para esta area.",
    };
  }

  const requestUrl = new URL(request.url);
  const host = request.headers.get("host") ?? requestUrl.host;
  let originUrl: URL;

  try {
    originUrl = new URL(origin);
  } catch {
    return {
      message: "Acesso negado para esta area.",
    };
  }

  if (originUrl.host !== host || originUrl.protocol !== requestUrl.protocol) {
    return {
      message: "Acesso negado para esta area.",
    };
  }

  return null;
}

function validateNoQuery(url: URL): VisitorErrorResponse | null {
  for (const parameter of url.searchParams.keys()) {
    return {
      message: "Revise os campos do visitante e tente novamente.",
      errors: {
        [parameter]: ["Este parametro nao e aceito nesta operacao."],
      },
    };
  }

  return null;
}

function buildPayloadError(field = "payload"): Response {
  return NextResponse.json(
    {
      message: "Envie apenas os campos permitidos do visitante.",
      errors: {
        [field]: ["Envie apenas os campos permitidos do visitante."],
      },
    },
    { status: 422 },
  );
}

function pickVisitorPayload(body: Record<string, unknown>): VisitorPayload | null {
  for (const field of Object.keys(body)) {
    if (!VISITOR_PAYLOAD_ALLOWLIST.includes(field as (typeof VISITOR_PAYLOAD_ALLOWLIST)[number])) {
      return null;
    }
  }

  return {
    display_name: typeof body.display_name === "string" ? body.display_name : "",
    status: body.status as VisitorPayload["status"],
    phone: typeof body.phone === "string" || body.phone === null ? body.phone : "",
    email: typeof body.email === "string" || body.email === null ? body.email : "",
  };
}

function buildValidationErrorBody(body: Record<string, unknown>): VisitorErrorResponse {
  const response: VisitorErrorResponse = {
    message: typeof body.message === "string"
      ? body.message
      : "Revise os campos do visitante e tente novamente.",
  };

  if (isValidationErrors(body.errors)) {
    response.errors = body.errors;
  }

  return response;
}

function buildSuccessBody(body: Record<string, unknown>): VisitorResponse | null {
  const visitor = readVisitor(body);

  if (!visitor) {
    return null;
  }

  return {
    data: {
      visitor,
    },
    ...(typeof body.message === "string" ? { message: body.message } : {}),
  };
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

function buildSafeBody(status: number, body: Record<string, unknown>): VisitorErrorResponse {
  if (status === 401) {
    return {
      message: typeof body.message === "string" ? body.message : "Sessao invalida. Entre novamente.",
    };
  }

  if (status === 403) {
    return {
      message: "Acesso negado para esta area.",
    };
  }

  if (status === 404) {
    return {
      message: "Visitante nao encontrado.",
    };
  }

  if (status === 422) {
    return buildValidationErrorBody(body);
  }

  if (status >= 500) {
    return {
      message: "Nao foi possivel concluir agora. Tente novamente em instantes.",
    };
  }

  return {
    message: "Nao foi possivel salvar o visitante agora.",
  };
}

export async function POST(request: Request): Promise<Response> {
  const originError = validateSameOriginMutation(request);

  if (originError) {
    return NextResponse.json(originError, { status: 403 });
  }

  const queryError = validateNoQuery(new URL(request.url));

  if (queryError) {
    return NextResponse.json(queryError, { status: 422 });
  }

  const token = readToken(request);

  if (!token) {
    return buildUnauthorizedResponse();
  }

  let requestBody: Record<string, unknown>;

  try {
    const parsedBody = await request.json();
    requestBody = parsedBody && typeof parsedBody === "object" && !Array.isArray(parsedBody)
      ? parsedBody as Record<string, unknown>
      : {};
  } catch {
    return buildInvalidJsonResponse();
  }

  const payload = pickVisitorPayload(requestBody);

  if (payload === null) {
    return buildPayloadError();
  }

  const response = await callLaravel("/api/v1/people/visitors", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const { body, status } = await normalizeAuthResponse(response);
  const successBody = response.ok ? buildSuccessBody(body) : null;
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
