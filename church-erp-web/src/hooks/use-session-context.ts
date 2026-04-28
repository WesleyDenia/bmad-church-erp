"use client";

import { useCallback, useEffect, useState } from "react";
import type { AuthenticatedSessionData } from "@/features/auth/session-types";

export type SessionState = {
  context: AuthenticatedSessionData | null;
  status: "loading" | "authenticated" | "unauthenticated" | "error";
  error: string | null;
  refresh: () => Promise<void>;
};

export function useSessionContext(): SessionState {
  const [context, setContext] = useState<AuthenticatedSessionData | null>(null);
  const [status, setStatus] = useState<SessionState["status"]>("loading");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);

    try {
      const response = await fetch("/api/auth/me", {
        method: "GET",
        cache: "no-store",
      });

      const body = (await response.json()) as
        | { data: AuthenticatedSessionData }
        | { message?: string };

      if (!response.ok) {
        setContext(null);
        setStatus("unauthenticated");
        setError("message" in body && body.message ? body.message : "Nao foi possivel carregar sua sessao.");
        return;
      }

      setContext("data" in body ? body.data : null);
      setStatus("authenticated");
    } catch {
      setContext(null);
      setStatus("error");
      setError("Nao foi possivel carregar sua sessao.");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      clearTimeout(timer);
    };
  }, [refresh]);

  return {
    context,
    status,
    error,
    refresh,
  };
}
