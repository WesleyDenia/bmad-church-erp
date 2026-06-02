import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import type {
  ChurchUserErrorResponse,
  UpdateChurchUserPayload,
  UpdateChurchUserResponse,
} from "@/features/church-users/contracts";

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

function buildInvalidJsonResponse(): Response {
  return NextResponse.json(
    { message: "Envie um JSON valido." },
    { status: 400 },
  );
}

function buildSafeErrorBody(status: number, body: { message?: unknown }) {
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
      message: "Nao foi possivel atualizar o usuario agora. Tente novamente.",
    };
  }

  return body;
}

function applyUnauthorizedCookieCleanup(response: NextResponse, status: number) {
  if (status === 401) {
    response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
      ...buildSessionCookieOptions(),
      maxAge: 0,
    });
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> | { id: string } },
): Promise<Response> {
  const token = getSessionToken(request);

  if (!token) {
    return buildUnauthorizedResponse();
  }

  let requestBody: Partial<UpdateChurchUserPayload>;

  try {
    requestBody = (await request.json()) as Partial<UpdateChurchUserPayload>;
  } catch {
    return buildInvalidJsonResponse();
  }

  const { id } = await Promise.resolve(context.params);
  const payload: UpdateChurchUserPayload = {};

  if (typeof requestBody.role === "string") {
    payload.role = requestBody.role;
  }

  if (typeof requestBody.status === "string") {
    payload.status = requestBody.status;
  }

  const response = await callLaravel(`/api/v1/church-users/${id}`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const { body, status } = await normalizeAuthResponse(response);
  const nextResponse = NextResponse.json(
    response.ok
      ? (body as UpdateChurchUserResponse)
      : (buildSafeErrorBody(status, body as { message?: unknown }) as ChurchUserErrorResponse),
    { status },
  );

  applyUnauthorizedCookieCleanup(nextResponse, status);

  return nextResponse;
}
