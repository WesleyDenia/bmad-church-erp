import { NextResponse } from "next/server.js";
import { randomUUID } from "node:crypto";
import { callLaravel } from "@/lib/api/client";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  createInternalJwt,
} from "@/features/auth/session";
import type { AuthenticatedSessionResponse } from "@/features/auth/session-types";
import { normalizeAuthResponse } from "@/features/auth/auth-response";

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json();

  const response = await callLaravel("/api/v1/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const { body, status } = await normalizeAuthResponse(response);

  if (!response.ok) {
    return NextResponse.json(body, { status });
  }

  const successBody = body as AuthenticatedSessionResponse;
  const sessionId = randomUUID();
  const sessionToken = createInternalJwt({
    user_id: successBody.data.user.id,
    church_id: successBody.data.church.id,
    roles: successBody.data.roles,
    session_id: sessionId,
    permissions_version: successBody.data.permissions_version,
    issuer: process.env.INTERNAL_API_ISSUER ?? "church-erp-web",
    audience: process.env.INTERNAL_API_AUDIENCE ?? "church-erp-api",
  });

  const responseBody = {
    ...successBody,
    data: {
      ...successBody.data,
      session_id: sessionId,
    },
  };

  const nextResponse = NextResponse.json(responseBody, { status });

  nextResponse.cookies.set(
    AUTH_SESSION_COOKIE_NAME,
    sessionToken,
    buildSessionCookieOptions(),
  );

  return nextResponse;
}
