import "server-only";

import { serverEnv } from "@/lib/env/server";

export type BffSessionContext = {
  user_id: string;
  church_id: string;
  roles: string[];
  session_id: string;
};

export type LaravelRequestOptions = RequestInit & {
  internalJwt?: string;
};

export async function callLaravel(
  path: string,
  options: LaravelRequestOptions = {},
): Promise<Response> {
  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");
  headers.set("X-Internal-Audience", serverEnv.internalApiAudience);
  headers.set("X-Internal-Issuer", serverEnv.internalApiIssuer);

  if (options.internalJwt) {
    headers.set("Authorization", `Bearer ${options.internalJwt}`);
  }

  return fetch(`${serverEnv.apiBaseUrl}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });
}
