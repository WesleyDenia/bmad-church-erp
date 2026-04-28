const GENERIC_ERROR_MESSAGE = "Nao foi possivel concluir agora. Tente novamente em instantes.";

export async function normalizeInitialSetupResponse(response) {
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return {
      body: {
        message: GENERIC_ERROR_MESSAGE,
      },
      status: response.ok ? 502 : response.status,
    };
  }

  return {
    body: await response.json(),
    status: response.status,
  };
}

export { GENERIC_ERROR_MESSAGE };
