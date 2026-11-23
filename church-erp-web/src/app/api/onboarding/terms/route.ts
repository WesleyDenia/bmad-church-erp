import { callLaravel } from "@/lib/api/client";

export async function GET(): Promise<Response> {
  const response = await callLaravel("/api/v1/onboarding/terms");
  const body = await response.json();

  return Response.json(body, {
    status: response.status,
  });
}
