"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CommunicationPendingBlock } from "@/components/operational/communication-pending-block";
import { EventScheduleBlock } from "@/components/operational/event-schedule-block";
import { PeopleFollowupBlock } from "@/components/operational/people-followup-block";
import { WeeklyChecklistBlock } from "@/components/operational/weekly-checklist-block";
import { Button } from "@/components/ui/button";
import type {
  SecretaryHome,
  SecretaryHomeErrorResponse,
  SecretaryHomeResponse,
  SecretaryHomeState,
} from "@/features/secretaria/secretary-home";

type SecretaryHomeUiState = {
  state: SecretaryHomeState;
  home: SecretaryHome | null;
  message: string | null;
  recovered_counts: {
    pending_total: number;
    recent_visitors_total: number;
  } | null;
};

function extractMessage(body: SecretaryHomeResponse | SecretaryHomeErrorResponse): string {
  return "message" in body && typeof body.message === "string"
    ? body.message
    : "Nao foi possivel carregar a secretaria agora.";
}

function normalizeState(status: number, home: SecretaryHome | null): SecretaryHomeState {
  if (status === 401 || status === 403) {
    return "denied_or_session_invalid";
  }

  if (home?.state === "secretary_home_loaded") {
    return "secretary_home_loaded";
  }

  if (home?.state === "empty_secretary_home") {
    return "empty_secretary_home";
  }

  return "server_error";
}

function aggregateCounts(home: SecretaryHome | null) {
  if (!home) {
    return null;
  }

  return {
    pending_total: home.people_pending_items.total_count,
    recent_visitors_total: home.recent_visitors.items.length,
  };
}

function QuickActions({ home }: { home: SecretaryHome | null }) {
  const actions = home?.quick_actions ?? [];

  return (
    <section className="rounded-md border border-[color:var(--color-border)] bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
        Atalhos
      </p>
      <h2 className="mt-3 text-xl font-semibold text-[color:var(--color-foreground)]">
        Acoes da rotina
      </h2>
      <div className="mt-5 grid gap-3">
        {actions.map((action) => (
          <div key={action.label}>
            {action.state === "available" ? (
              <Button asChild variant="default" className="w-full">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ) : (
              <>
                <Button disabled variant="secondary" className="w-full">
                  {action.label}
                </Button>
                <p className="mt-2 text-xs text-[color:var(--color-muted)]">
                  Fluxo em preparacao para uma proxima etapa.
                </p>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export function SecretaryHomeShell() {
  const [uiState, setUiState] = useState<SecretaryHomeUiState>({
    state: "loading_secretary_home",
    home: null,
    message: null,
    recovered_counts: null,
  });
  const lastReliableHomeRef = useRef<SecretaryHome | null>(null);

  const loadHome = useCallback(async (signal?: AbortSignal): Promise<void> => {
    setUiState((current) => ({
      state: "loading_secretary_home",
      home: null,
      message: null,
      recovered_counts: current.recovered_counts,
    }));

    try {
      const response = await fetch("/api/secretary/home", {
        method: "GET",
        cache: "no-store",
        signal,
      });
      const body = (await response.json()) as SecretaryHomeResponse | SecretaryHomeErrorResponse;
      const home = "data" in body ? body.data.secretary_home : null;

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          lastReliableHomeRef.current = null;
          setUiState({
            state: "denied_or_session_invalid",
            home: null,
            message: extractMessage(body),
            recovered_counts: null,
          });

          return;
        }

        const recoveredCounts = aggregateCounts(lastReliableHomeRef.current);

        setUiState({
          state: recoveredCounts ? "technical_recovered_without_pii" : "server_error",
          home: null,
          message: extractMessage(body),
          recovered_counts: recoveredCounts,
        });

        return;
      }

      const nextState = normalizeState(response.status, home);

      setUiState({
        state: nextState,
        home,
        message: null,
        recovered_counts: null,
      });

      if (nextState === "secretary_home_loaded" || nextState === "empty_secretary_home") {
        lastReliableHomeRef.current = home;
      }
    } catch {
      if (signal?.aborted) {
        return;
      }

      const recoveredCounts = aggregateCounts(lastReliableHomeRef.current);

      setUiState({
        state: recoveredCounts ? "technical_recovered_without_pii" : "server_error",
        home: null,
        message: "Nao foi possivel carregar a secretaria agora.",
        recovered_counts: recoveredCounts,
      });
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    queueMicrotask(() => {
      void loadHome(controller.signal);
    });

    return () => {
      controller.abort();
    };
  }, [loadHome]);

  const isLoading = uiState.state === "loading_secretary_home";
  const isDenied = uiState.state === "denied_or_session_invalid";
  const hasError = uiState.state === "server_error";

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-md border border-[color:var(--color-border)] bg-white p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-accent)]">
            Secretaria
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-[color:var(--color-foreground)] sm:text-4xl">
            Rotina operacional
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)]" aria-live="polite">
            {isLoading
              ? "Carregando dados reais de pessoas pelo BFF."
              : isDenied
                ? uiState.message ?? "Sessao invalida ou perfil sem acesso."
                : hasError
                  ? uiState.message ?? "Falha tecnica ao carregar a secretaria."
                  : "Pendencias, visitantes e proximos passos carregados da fonte real da igreja."}
          </p>
        </div>

        {!isDenied && <QuickActions home={uiState.home} />}
      </section>

      {!isDenied && (
        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <PeopleFollowupBlock
            pending={uiState.home?.people_pending_items ?? null}
            visitors={uiState.home?.recent_visitors ?? null}
            recovered_counts={uiState.recovered_counts}
          />

          <div className="grid gap-6">
            <WeeklyChecklistBlock checklist={uiState.home?.weekly_checklist ?? null} />
            <EventScheduleBlock block={uiState.home?.event_schedule ?? null} />
            <CommunicationPendingBlock block={uiState.home?.communication_pending ?? null} />
          </div>
        </section>
      )}
    </main>
  );
}
