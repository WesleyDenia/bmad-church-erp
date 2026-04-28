export const GENERIC_AUTH_ERROR_MESSAGE =
  "Nao foi possivel concluir o acesso agora. Tente novamente em instantes.";

export async function normalizeAuthResponse(response: Response): Promise<{
  body: Record<string, unknown>;
  status: number;
}> {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return {
      body: {
        message: GENERIC_AUTH_ERROR_MESSAGE,
      },
      status: response.ok ? 502 : response.status,
    };
  }

  return {
    body: (await response.json()) as Record<string, unknown>,
    status: response.status,
  };
}
