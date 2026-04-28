import { callLaravel } from "@/lib/api/client";
import { normalizeInitialSetupResponse } from "@/features/auth/initial-setup-response";

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json();

  const response = await callLaravel("/api/v1/onboarding/initial-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const { body, status } = await normalizeInitialSetupResponse(response);

  return Response.json(body, {
    status,
  });
}
