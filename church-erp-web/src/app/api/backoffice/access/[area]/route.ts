import { NextResponse } from "next/server.js";
import { callLaravel } from "@/lib/api/client";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import { normalizeAccessResponse } from "@/features/auth/access-response";

type RouteContext = {
  params: {
    area: string;
  } | Promise<{
    area: string;
  }>;
};

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const { area } = await Promise.resolve(context.params);
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

  const response = await callLaravel(`/api/v1/backoffice/access/${area}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { body, status } = await normalizeAccessResponse(response);
  const safeBody =
    status === 401 || status === 403
      ? {
          message: typeof body.message === "string" ? body.message : "Acesso negado para esta area.",
        }
      : body;

  const nextResponse = NextResponse.json(safeBody, { status });

  if (status === 401) {
    nextResponse.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
      ...buildSessionCookieOptions(),
      maxAge: 0,
    });
  }

  return nextResponse;
}
