import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import type {
  CreateChurchUserErrorResponse,
  CreateChurchUserPayload,
  CreateChurchUserResponse,
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

export async function POST(request: Request): Promise<Response> {
  const token = getSessionToken(request);

  if (!token) {
    return buildUnauthorizedResponse();
  }

  let requestBody: Partial<CreateChurchUserPayload>;

  try {
    requestBody = (await request.json()) as Partial<CreateChurchUserPayload>;
  } catch {
    return buildInvalidJsonResponse();
  }

  const payload: CreateChurchUserPayload = {
    name: requestBody.name ?? "",
    email: requestBody.email ?? "",
    password: requestBody.password ?? "",
    password_confirmation: requestBody.password_confirmation ?? "",
    role: requestBody.role ?? "treasurer",
  };

  const response = await callLaravel("/api/v1/church-users", {
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
            message: "Nao foi possivel cadastrar o usuario agora. Tente novamente.",
          }
        : body;

  const nextResponse = NextResponse.json(
    response.ok
      ? (body as CreateChurchUserResponse)
      : (safeBody as CreateChurchUserErrorResponse),
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
