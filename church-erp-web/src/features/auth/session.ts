import { createSign, randomUUID } from "node:crypto";
import { AUTH_SESSION_TTL_SECONDS } from "@/features/auth/session-constants";
import type {
  AuthErrorResponse,
  InternalJwtPayload,
} from "@/features/auth/session-types";

export { AUTH_SESSION_COOKIE_NAME } from "@/features/auth/session-constants";
export { AUTH_SESSION_TTL_SECONDS } from "@/features/auth/session-constants";

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function readInternalJwtPrivateKey(): string {
  const privateKey = process.env.INTERNAL_JWT_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("Missing required server env: INTERNAL_JWT_PRIVATE_KEY");
  }

  return privateKey;
}

export function buildSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: AUTH_SESSION_TTL_SECONDS,
  };
}

export function createInternalJwt(payload: InternalJwtPayload): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const issuedAt = Math.floor(Date.now() / 1000);
  const expiration = issuedAt + AUTH_SESSION_TTL_SECONDS;
  const jti = randomUUID();
  const signingPayload = {
    sub: String(payload.user_id),
    user_id: payload.user_id,
    church_id: payload.church_id,
    roles: payload.roles,
    session_id: payload.session_id,
    permissions_version: payload.permissions_version,
    iss: payload.issuer,
    aud: payload.audience,
    iat: issuedAt,
    exp: expiration,
    jti,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(signingPayload));
  const signer = createSign("RSA-SHA256");

  signer.update(`${encodedHeader}.${encodedPayload}`);
  signer.end();

  const signature = signer.sign(readInternalJwtPrivateKey(), "base64url");

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function decodeSessionCookieValue(value: string): string | null {
  const trimmedValue = value.trim();

  if (trimmedValue.length === 0) {
    return null;
  }

  return trimmedValue;
}

export function readSessionTokenFromCookieValue(cookieValue: string | undefined): string | null {
  if (!cookieValue) {
    return null;
  }

  return decodeSessionCookieValue(cookieValue);
}

export function createFallbackSessionMessage(message: string): AuthErrorResponse {
  return {
    message,
  };
}

export function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split(".");

  if (parts.length !== 3) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(parts[1])) as Record<string, unknown>;
  } catch {
    return null;
  }
}
