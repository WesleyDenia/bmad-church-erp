export const GENERIC_ACCESS_ERROR_MESSAGE =
  "Nao foi possivel verificar o acesso agora. Tente novamente em instantes.";

export async function normalizeAccessResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return {
      body: {
        message: GENERIC_ACCESS_ERROR_MESSAGE,
      },
      status: response.ok ? 502 : response.status,
    };
  }

  const body = await response.json();

  return {
    body: {
      message:
        typeof body.message === "string" ? body.message : GENERIC_ACCESS_ERROR_MESSAGE,
    },
    status: response.status,
  };
}
