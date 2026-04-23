import { callLaravel } from "@/lib/api/client";

export async function POST(request: Request): Promise<Response> {
  const payload = await request.json();

  const response = await callLaravel("/api/v1/onboarding/initial-setup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await response.json();

  return Response.json(body, {
    status: response.status,
  });
}
