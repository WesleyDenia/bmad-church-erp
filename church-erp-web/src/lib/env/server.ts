type RequiredServerEnv =
  | "API_BASE_URL"
  | "INTERNAL_API_AUDIENCE"
  | "INTERNAL_API_ISSUER";

function readEnv(name: RequiredServerEnv): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing required server env: ${name}`);
  }

  return value;
}

export const serverEnv = {
  apiBaseUrl: readEnv("API_BASE_URL"),
  internalApiAudience: readEnv("INTERNAL_API_AUDIENCE"),
  internalApiIssuer: readEnv("INTERNAL_API_ISSUER"),
};
