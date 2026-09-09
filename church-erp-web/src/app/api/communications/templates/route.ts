import { NextResponse } from "next/server.js";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import {
  normalizeCommunicationTemplateResponse,
  type CommunicationTemplateErrorResponse,
} from "@/features/communications/communication-template";
import { callLaravel } from "@/lib/api/client";

const BLOCKED_QUERY_PARAMETERS = [
  "church_id",
  "tenant",
  "scope",
  "role",
  "roles",
  "permission",
  "user_id",
  "id",
  "template_id",
  "status",
  "created_at",
  "updated_at",
] as const;

function readToken(request: Request): string | null {
  return readSessionTokenFromCookieValue(
    readCookieValue(request.headers.get("cookie"), AUTH_SESSION_COOKIE_NAME),
  );
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function readCookieValue(cookieHeader: string | null, name: string): string | undefined {
  if (!cookieHeader) {
    return undefined;
  }

  return cookieHeader.match(new RegExp(`(?:^|;\\s*)${escapeRegExp(name)}=([^;]*)`))?.[1];
}

function validateCommunicationTemplateQuery(url: URL): CommunicationTemplateErrorResponse | null {
  for (const parameter of url.searchParams.keys()) {
    return {
      message: "Revise a leitura dos modelos de comunicacao e tente novamente.",
      errors: {
        [parameter]: [
          BLOCKED_QUERY_PARAMETERS.includes(parameter as (typeof BLOCKED_QUERY_PARAMETERS)[number])
            ? "Este parametro nao pode ser informado pelo navegador."
            : "Esta leitura nao aceita parametros.",
        ],
      },
    };
  }

  return null;
}

function buildSafeBody(status: number): CommunicationTemplateErrorResponse {
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
    return {
      message: "Revise a leitura dos modelos de comunicacao e tente novamente.",
    };
  }

  if (status === 404) {
    return {
      message: "Nao foi possivel encontrar os modelos de comunicacao agora.",
    };
  }

  return {
    message: "Nao foi possivel carregar os modelos de comunicacao agora.",
  };
}

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
    ...buildSessionCookieOptions(),
    maxAge: 0,
  });
}

export async function GET(request: Request): Promise<Response> {
  const queryError = validateCommunicationTemplateQuery(new URL(request.url));

  if (queryError) {
    return NextResponse.json(queryError, { status: 422 });
  }

  const token = readToken(request);

  if (!token) {
    const response = NextResponse.json(buildSafeBody(401), { status: 401 });

    clearSessionCookie(response);

    return response;
  }

  try {
    const response = await callLaravel("/api/v1/communications/templates", {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    const { body, status } = await normalizeAuthResponse(response);
    const normalizedBody = response.ok ? normalizeCommunicationTemplateResponse(body) : null;
    const nextResponse = NextResponse.json(
      response.ok && normalizedBody ? normalizedBody : buildSafeBody(response.ok ? 500 : status),
      { status: response.ok && normalizedBody ? status : response.ok ? 500 : status },
    );

    if (status === 401) {
      clearSessionCookie(nextResponse);
    }

    return nextResponse;
  } catch {
    return NextResponse.json(buildSafeBody(500), { status: 500 });
  }
}
