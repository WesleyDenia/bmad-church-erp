"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Surface } from "@/components/design-system/surface";
import { AccessDeniedPanel } from "@/components/operational/access-denied-panel";
import type { AppArea } from "@/types/navigation";
import {
  GENERIC_ACCESS_ERROR_MESSAGE,
  normalizeAccessResponse,
} from "@/features/auth/access-response";

type AreaGuardState =
  | {
      status: "loading";
      message: string | null;
    }
  | {
      status: "allowed";
      message: string | null;
    }
  | {
      status: "denied";
      message: string;
    };

type AreaGuardProps = {
  area: AppArea;
  title: string;
  deniedMessage: string;
  children: ReactNode;
};

export function AreaGuard({
  area,
  title,
  deniedMessage,
  children,
}: AreaGuardProps) {
  const [state, setState] = useState<AreaGuardState>({
    status: "loading",
    message: "Verificando acesso...",
  });

  useEffect(() => {
    const controller = new AbortController();

    async function checkAccess() {
      setState({
        status: "loading",
        message: "Verificando acesso...",
      });

      try {
        const response = await fetch(`/api/backoffice/access/${area}`, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
        });

        await normalizeAccessResponse(response);

        if (!response.ok) {
          let message = GENERIC_ACCESS_ERROR_MESSAGE;

          if (response.status === 403) {
            message = deniedMessage;
          }

          setState({
            status: "denied",
            message,
          });
          return;
        }

        setState({
          status: "allowed",
          message: null,
        });
      } catch {
        if (controller.signal.aborted) {
          return;
        }

        setState({
          status: "denied",
          message: GENERIC_ACCESS_ERROR_MESSAGE,
        });
      }
    }

    void checkAccess();

    return () => {
      controller.abort();
    };
  }, [area, deniedMessage]);

  if (state.status === "loading") {
    return (
      <Surface className="mx-auto max-w-5xl p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-accent)]">
          {title}
        </p>
        <h1 className="mt-4 text-3xl font-semibold text-[color:var(--color-foreground)]">
          Carregando acesso...
        </h1>
        <p className="mt-4 text-base leading-8 text-[color:var(--color-muted)]">
          {state.message}
        </p>
      </Surface>
    );
  }

  if (state.status === "denied") {
    return (
      <AccessDeniedPanel title={title} message={state.message} />
    );
  }

  return <>{children}</>;
}
