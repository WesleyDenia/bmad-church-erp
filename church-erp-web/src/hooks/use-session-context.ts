import type { BffSessionContext } from "@/lib/api/client";

export function useSessionContext(): BffSessionContext | null {
  // Story 1.1 only reserves the hook contract for the authenticated BFF flow.
  return null;
}
