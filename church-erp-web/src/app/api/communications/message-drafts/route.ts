import { NextResponse } from "next/server.js";
import { normalizeAuthResponse } from "@/features/auth/auth-response";
import {
  AUTH_SESSION_COOKIE_NAME,
  buildSessionCookieOptions,
  readSessionTokenFromCookieValue,
} from "@/features/auth/session";
import {
  normalizeCommunicationMessageDraftResponse,
  type CommunicationMessageDraftErrorResponse,
  type CommunicationMessageDraftPayload,
} from "@/features/communications/message-draft";
import { callLaravel } from "@/lib/api/client";

const ALLOWED_FIELDS = ["template_key", "person_type", "person_id"] as const;
const TEMPLATE_KEY_PATTERN = /^[a-z0-9_:-]{1,80}$/;

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

function buildSafeBody(status: number): CommunicationMessageDraftErrorResponse {
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
      message: "Nao foi possivel preparar esta mensagem.",
    };
  }

  if (status === 422) {
    return {
      message: "Revise os dados para preparar a mensagem.",
    };
  }

  return {
    message: "Nao foi possivel preparar a mensagem agora.",
  };
}

function clearSessionCookie(response: NextResponse): void {
  response.cookies.set(AUTH_SESSION_COOKIE_NAME, "", {
    ...buildSessionCookieOptions(),
    maxAge: 0,
  });
}

function validateSameOrigin(request: Request): CommunicationMessageDraftErrorResponse | null {
  const origin = request.headers.get("origin");

  if (!origin) {
    return null;
  }

  if (origin !== new URL(request.url).origin) {
    return {
      message: "Revise os dados para preparar a mensagem.",
    };
  }

  return null;
}

async function readPayload(request: Request): Promise<CommunicationMessageDraftPayload | CommunicationMessageDraftErrorResponse> {
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) {
    return buildSafeBody(422);
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return buildSafeBody(422);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return buildSafeBody(422);
  }

  const record = body as Record<string, unknown>;
  const keys = Object.keys(record);

  if (
    keys.length !== ALLOWED_FIELDS.length
    || keys.some((key) => !ALLOWED_FIELDS.includes(key as (typeof ALLOWED_FIELDS)[number]))
    || typeof record.template_key !== "string"
    || !TEMPLATE_KEY_PATTERN.test(record.template_key)
    || (record.person_type !== "member" && record.person_type !== "visitor")
    || typeof record.person_id !== "number"
    || !Number.isSafeInteger(record.person_id)
    || record.person_id < 1
  ) {
    return buildSafeBody(422);
  }

  return {
    template_key: record.template_key,
    person_type: record.person_type,
    person_id: record.person_id,
  };
}

export async function POST(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if ([...url.searchParams.keys()].length > 0) {
    return NextResponse.json(buildSafeBody(422), { status: 422 });
  }

  const sameOriginError = validateSameOrigin(request);

  if (sameOriginError) {
    return NextResponse.json(sameOriginError, { status: 422 });
  }

  const token = readToken(request);

  if (!token) {
    const response = NextResponse.json(buildSafeBody(401), { status: 401 });

    clearSessionCookie(response);

    return response;
  }

  const payload = await readPayload(request);

  if ("message" in payload) {
    return NextResponse.json(payload, { status: 422 });
  }

  try {
    const response = await callLaravel("/api/v1/communications/message-drafts", {
      method: "POST",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const { body, status } = await normalizeAuthResponse(response);
    const normalizedBody = response.ok ? normalizeCommunicationMessageDraftResponse(body) : null;
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
