const ALLOWED_BFF_PROTOCOLS = new Set(["http:", "https:"]);

export function resolveInternalBffBaseUrl(
  configuredBaseUrl: string | undefined,
  fallbackBaseUrl: string,
): string {
  const value = configuredBaseUrl?.trim();

  if (!value) {
    return fallbackBaseUrl;
  }

  try {
    const url = new URL(value);

    return ALLOWED_BFF_PROTOCOLS.has(url.protocol)
      ? url.origin
      : fallbackBaseUrl;
  } catch {
    return fallbackBaseUrl;
  }
}

export function buildInternalBffRequestHeaders(cookie: string): HeadersInit | undefined {
  return cookie ? { cookie } : undefined;
}
