import type { OnboardingTerms, OnboardingTermsResponse } from "@/features/auth/initial-setup";

export function parseOnboardingTerms(body: unknown): OnboardingTerms | null {
  if (!body || typeof body !== "object" || !("data" in body)) {
    return null;
  }

  const data = (body as OnboardingTermsResponse).data;

  if (
    !data ||
    !Number.isInteger(data.id) ||
    data.id <= 0 ||
    !Number.isInteger(data.version) ||
    data.version <= 0 ||
    typeof data.content !== "string" ||
    data.content.trim() === "" ||
    typeof data.content_hash !== "string" ||
    !/^[a-f0-9]{64}$/.test(data.content_hash)
  ) {
    return null;
  }

  return data;
}

export function isLatestTermsRequest(requestId: number, latestRequestId: number): boolean {
  return requestId === latestRequestId;
}
