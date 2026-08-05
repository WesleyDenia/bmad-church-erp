"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LeadershipSummaryBlock } from "@/components/operational/leadership-summary-block";
import { Button } from "@/components/ui/button";
import { formatDecimalAmountForDisplay } from "@/features/finance/amount";
import type {
  ClosingSummaryCostCenterBreakdownRow,
  ClosingSummarySubtypeBreakdownRow,
  FinancialClosingSummary,
  FinancialClosingSummaryErrorResponse,
  FinancialClosingSummaryResponse,
} from "@/features/finance/closing-summary";
import {
  buildInitialLeadershipSummaryState,
  buildLeadershipSummaryPresentation,
  getLeadershipConfidenceStatus,
  isLeadershipDetailsReconciled,
  type LeadershipSummaryLoadState,
  type LeadershipSummaryUiState,
  type OperationalSignalsState,
} from "@/features/leadership/leadership-summary";

type ConferencePeriodState = {
  period_start: string;
  period_end: string;
};

const operationalSignalsState: OperationalSignalsState = "operational_signals_unavailable";

function normalizeState(
  status: number,
  summary: FinancialClosingSummary | null,
): LeadershipSummaryLoadState {
  if (status === 401 || status === 403) {
    return "leadership_denied_or_session_invalid";
  }

  if (status === 409 || summary?.state === "consistency_error") {
    return "leadership_consistency_error";
  }

  if (summary?.state === "empty_closing_summary") {
    return "empty_leadership_summary";
  }

  if (summary?.state === "closing_summary_loaded") {
    return "leadership_summary_loaded";
  }

  return "leadership_server_error";
}

function extractMessage(body: FinancialClosingSummaryResponse | FinancialClosingSummaryErrorResponse): string {
  return "message" in body && typeof body.message === "string"
    ? body.message
    : "Nao foi possivel carregar a leitura da lideranca agora.";
}

function detailsPeriodMatches(
  baseSummary: Pick<FinancialClosingSummary, "period_start" | "period_end">,
  detailsSummary: FinancialClosingSummary,
): boolean {
  return baseSummary.period_start === detailsSummary.period_start
    && baseSummary.period_end === detailsSummary.period_end;
}

function buildConferenceTimestamp(value: string, boundary: "start" | "end"): string | null {
  if (value === "") {
    return null;
  }

  return `${value}T${boundary === "start" ? "00:00:00" : "23:59:59"}Z`;
}

function BreakdownRows({
  title,
  rows,
  type,
}: {
  title: string;
  rows: ClosingSummaryCostCenterBreakdownRow[] | ClosingSummarySubtypeBreakdownRow[];
  type: "cost_center" | "subtype";
}) {
  if (rows.length === 0) {
    return (
      <section>
        <h3 className="text-sm font-semibold text-[color:var(--color-foreground)]">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
          Sem movimento agregado neste periodo.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h3 className="text-sm font-semibold text-[color:var(--color-foreground)]">{title}</h3>
      <div className="mt-3 divide-y divide-[rgba(15,118,110,0.12)]">
        {rows.map((row) => {
          const label = type === "cost_center"
            ? (row as ClosingSummaryCostCenterBreakdownRow).cost_center_name
            : (row as ClosingSummarySubtypeBreakdownRow).financial_category_name;

          return (
            <div
              key={type === "cost_center"
                ? (row as ClosingSummaryCostCenterBreakdownRow).cost_center_key
                : (row as ClosingSummarySubtypeBreakdownRow).financial_category_id}
              className="py-3"
            >
              <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                {label}
              </p>
              <p className="mt-1 text-xs leading-5 text-[color:var(--color-muted)]">
                Receitas {formatDecimalAmountForDisplay(row.total_income)}, despesas {formatDecimalAmountForDisplay(row.total_expense)}, saldo {formatDecimalAmountForDisplay(row.net_result)}, {row.entry_count} lancamento{row.entry_count === 1 ? "" : "s"}.
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function LeadershipHomeShell() {
  const [summaryState, setSummaryState] = useState<LeadershipSummaryUiState>(
    buildInitialLeadershipSummaryState,
  );
  const lastReliableSummaryRef = useRef<FinancialClosingSummary | null>(null);
  const [conferencePeriod, setConferencePeriod] = useState<ConferencePeriodState>({
    period_start: "",
    period_end: "",
  });

  const loadSummary = useCallback(async (
    signal?: AbortSignal,
    options?: {
      includeDetails?: boolean;
      period_start?: string;
      period_end?: string;
      expected_period_start?: string;
      expected_period_end?: string;
    },
  ): Promise<FinancialClosingSummary | null> => {
    setSummaryState((current) => ({
      state: options?.includeDetails ? "loading_leadership_details" : "loading_leadership_summary",
      summary: current.summary,
      message: null,
    }));

    const params = new URLSearchParams();

    if (options?.includeDetails) {
      params.set("include_details", "true");
    }

    if (options?.period_start && options.period_end) {
      params.set("period_start", options.period_start);
      params.set("period_end", options.period_end);
    }

    const query = params.toString();

    try {
      const response = query === ""
        ? await fetch("/api/leadership/closing-summary", {
          method: "GET",
          cache: "no-store",
          signal,
        })
        : await fetch(`/api/leadership/closing-summary?${query}`, {
          method: "GET",
          cache: "no-store",
          signal,
        });
      const body = (await response.json()) as
        | FinancialClosingSummaryResponse
        | FinancialClosingSummaryErrorResponse;
      const responseSummary = "data" in body
        ? body.data?.closing_summary ?? null
        : null;

      if (!response.ok) {
        const nextState = normalizeState(response.status, responseSummary);
        const lastReliableSummary = lastReliableSummaryRef.current;
        const recoveredState = response.status >= 500 && lastReliableSummary !== null
          ? "leadership_stale_state_recovered"
          : nextState;

        setSummaryState({
          state: recoveredState,
          summary: recoveredState === "leadership_stale_state_recovered"
            ? lastReliableSummary
            : responseSummary,
          message: extractMessage(body),
        });

        return null;
      }

      const nextSummary = (body as FinancialClosingSummaryResponse).data.closing_summary;
      let nextState = normalizeState(response.status, nextSummary);

      if (options?.includeDetails) {
        if (
          options?.expected_period_start
          && options.expected_period_end
          && !detailsPeriodMatches({
            period_start: options.expected_period_start,
            period_end: options.expected_period_end,
          }, nextSummary)
        ) {
          nextState = "leadership_server_error";
        } else if (
          nextSummary.state === "closing_summary_loaded"
          && isLeadershipDetailsReconciled(nextSummary)
        ) {
          nextState = "leadership_details_loaded";
        }
      }

      setSummaryState({
        state: nextState,
        summary: nextSummary,
        message: nextState === "leadership_server_error"
          ? "A leitura detalhada retornou outro periodo. Recarregue a leitura principal."
          : null,
      });

      if (nextState === "leadership_summary_loaded" || nextState === "leadership_details_loaded") {
        lastReliableSummaryRef.current = nextSummary;
      }

      return nextSummary;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }

      setSummaryState({
        state: lastReliableSummaryRef.current ? "leadership_stale_state_recovered" : "leadership_server_error",
        summary: lastReliableSummaryRef.current,
        message: error instanceof Error
          ? error.message
          : "Nao foi possivel carregar a leitura da lideranca agora.",
      });

      return null;
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    queueMicrotask(() => {
      void loadSummary(controller.signal);
    });

    return () => {
      controller.abort();
    };
  }, [loadSummary]);

  const presentation = useMemo(() => (
    summaryState.summary
      ? buildLeadershipSummaryPresentation(summaryState.summary, summaryState.state)
      : null
  ), [summaryState.state, summaryState.summary]);
  const confidenceStatus = getLeadershipConfidenceStatus(
    summaryState.state,
    summaryState.summary,
  );
  const detailsAvailable =
    summaryState.state === "leadership_details_loaded"
    && isLeadershipDetailsReconciled(summaryState.summary);
  const detailsBlocked =
    summaryState.state === "empty_leadership_summary"
    || summaryState.state === "leadership_consistency_error"
    || summaryState.state === "leadership_denied_or_session_invalid"
    || summaryState.state === "leadership_server_error"
    || summaryState.state === "leadership_stale_state_recovered";

  function handleLoadDetails() {
    const baseSummary = summaryState.summary;

    if (!baseSummary || detailsBlocked) {
      return;
    }

    void loadSummary(undefined, {
      includeDetails: true,
      period_start: baseSummary.period_start,
      period_end: baseSummary.period_end,
      expected_period_start: baseSummary.period_start,
      expected_period_end: baseSummary.period_end,
    });
  }

  function handleConferenceSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const periodStart = buildConferenceTimestamp(conferencePeriod.period_start, "start");
    const periodEnd = buildConferenceTimestamp(conferencePeriod.period_end, "end");

    if (!periodStart || !periodEnd) {
      setSummaryState((current) => ({
        state: current.summary ? "leadership_stale_state_recovered" : "leadership_server_error",
        summary: current.summary,
        message: "Informe inicio e fim do periodo de conferencia.",
      }));
      return;
    }

    void loadSummary(undefined, {
      period_start: periodStart,
      period_end: periodEnd,
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <LeadershipSummaryBlock
          title="Fechamento do periodo"
          summary={
            summaryState.state === "loading_leadership_summary"
              ? "Carregando a leitura consolidada do periodo atual."
              : presentation
                ? "Leitura formada a partir do fechamento consolidado da tesouraria."
                : summaryState.message ?? "Nao ha leitura disponivel neste momento."
          }
          action_label={
            summaryState.summary?.state === "closing_summary_loaded"
              ? summaryState.state === "loading_leadership_details"
                ? "Carregando detalhe"
                : "Ver detalhe agregado"
              : undefined
          }
          action_disabled={summaryState.state === "loading_leadership_details" || detailsBlocked}
          onAction={handleLoadDetails}
        >
          {presentation ? (
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="font-semibold text-[color:var(--color-foreground)]">Periodo</dt>
                <dd className="mt-1 text-[color:var(--color-muted)]">{presentation.period_label}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[color:var(--color-foreground)]">Resultado liquido</dt>
                <dd className="mt-1 text-[color:var(--color-muted)]">{presentation.net_result_label}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[color:var(--color-foreground)]">Receitas</dt>
                <dd className="mt-1 text-[color:var(--color-muted)]">{presentation.total_income_label}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[color:var(--color-foreground)]">Despesas</dt>
                <dd className="mt-1 text-[color:var(--color-muted)]">{presentation.total_expense_label}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[color:var(--color-foreground)]">Movimentos</dt>
                <dd className="mt-1 text-[color:var(--color-muted)]">{presentation.entry_count_label}</dd>
              </div>
              <div>
                <dt className="font-semibold text-[color:var(--color-foreground)]">Base de calculo</dt>
                <dd className="mt-1 text-[color:var(--color-muted)]">{presentation.calculation_basis_label}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm leading-7 text-[color:var(--color-muted)]">
              {summaryState.message ?? "A leitura sera mostrada assim que o fechamento responder."}
            </p>
          )}

          {detailsAvailable && summaryState.summary?.details ? (
            <div className="mt-6 grid gap-5">
              <BreakdownRows
                title="Por centro de custo"
                rows={summaryState.summary.details.by_cost_center}
                type="cost_center"
              />
              <BreakdownRows
                title="Por subtipo"
                rows={summaryState.summary.details.by_subtype}
                type="subtype"
              />
            </div>
          ) : null}
        </LeadershipSummaryBlock>

        <LeadershipSummaryBlock
          title="Confianca da leitura"
          summary={
            confidenceStatus === "detalhe_reconciliado"
              ? "Os agregados por centro de custo e subtipo conferem com o total consolidado."
              : confidenceStatus === "consolidado_carregado"
                ? "O consolidado foi carregado. O detalhe reconciliado fica disponivel sob demanda."
                : summaryState.message ?? "A leitura nao esta disponivel para decisao agora."
          }
        >
          <p className="rounded-[1.25rem] border border-[rgba(15,118,110,0.16)] bg-[rgba(240,253,250,0.62)] px-4 py-3 text-sm font-semibold text-[color:var(--color-accent)]">
            {presentation?.confidence_label ?? "Leitura indisponivel"}
          </p>
          {summaryState.state === "leadership_stale_state_recovered" ? (
            <p className="mt-3 text-sm leading-6 text-rose-800">
              Leitura anterior preservada apenas para referencia. Recarregue antes de decidir.
            </p>
          ) : null}
        </LeadershipSummaryBlock>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <LeadershipSummaryBlock
          title="Sinais operacionais"
          summary="A leitura operacional sera completada apos as entregas de pessoas e comunicacao."
        >
          <p
            className="text-sm font-semibold text-[color:var(--color-foreground)]"
            data-state={operationalSignalsState}
          >
            Leitura operacional ainda indisponivel
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
            Sem fonte real desses dominios nesta etapa. Nenhum dado foi criado para preencher este bloco.
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
            Proximo passo: completar as entregas de pessoas e comunicacao para formar esta leitura.
          </p>
        </LeadershipSummaryBlock>

        <form
          className="rounded-[2rem] border border-[color:var(--color-border)] bg-white/85 p-6 shadow-[0_20px_60px_rgba(30,41,59,0.08)] sm:p-7"
          onSubmit={handleConferenceSubmit}
        >
          <h2 className="text-xl font-semibold text-[color:var(--color-foreground)]">
            Conferir outro periodo
          </h2>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
              Inicio
              <input
                type="date"
                className="h-11 rounded-[1rem] border border-[color:var(--color-border)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
                value={conferencePeriod.period_start}
                onChange={(event) => {
                  setConferencePeriod((current) => ({
                    ...current,
                    period_start: event.target.value,
                  }));
                }}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-[color:var(--color-foreground)]">
              Fim
              <input
                type="date"
                className="h-11 rounded-[1rem] border border-[color:var(--color-border)] bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--color-accent)]"
                value={conferencePeriod.period_end}
                onChange={(event) => {
                  setConferencePeriod((current) => ({
                    ...current,
                    period_end: event.target.value,
                  }));
                }}
              />
            </label>
          </div>
          <Button type="submit" className="mt-5 w-full rounded-[1.25rem]">
            Conferir periodo
          </Button>
        </form>
      </section>
    </main>
  );
}
