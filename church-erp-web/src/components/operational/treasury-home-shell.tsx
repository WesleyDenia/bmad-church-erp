"use client";

import { useCallback, useEffect, useState } from "react";
import { ClosingStatusBlock } from "@/components/operational/closing-status-block";
import { OperationalPendingBlock } from "@/components/operational/operational-pending-block";
import { PayablesReceivablesBlock } from "@/components/operational/payables-receivables-block";
import { QuickActionRail } from "@/components/operational/quick-action-rail";
import { TreasuryEntryForm } from "@/components/operational/treasury-entry-form";
import { WeeklyPriorityBlock } from "@/components/operational/weekly-priority-block";
import type {
  ClosingDetailsUiState,
  ClosingSummaryUiState,
  FinancialClosingSummary,
  FinancialClosingSummaryErrorResponse,
  FinancialClosingSummaryResponse,
} from "@/features/finance/closing-summary";
import {
  buildClosingSummaryStateFromDetailsConsistencyError,
  buildClosingSummaryPresentation,
  buildInitialClosingDetailsState,
  buildInitialClosingSummaryState,
  shouldPromoteDetailsErrorToClosingSummary,
  shouldReloadClosingDetailsAfterEntryMutation,
} from "@/features/finance/closing-summary";
import type {
  FinancialPendingItemRecord,
  FinancialPendingItemsErrorResponse,
  FinancialPendingItemsResponse,
} from "@/features/finance/financial-pending-item";
import {
  activatePendingItemSelection,
  buildPendingItemsPresentation,
  clearPendingItemSelection,
  initialFinancialPendingSelectionState,
  resolvePendingItemSelection,
} from "@/features/finance/financial-pending-item";
import { treasury_home_view_model } from "@/features/treasury/home-view-model";

export function TreasuryHomeShell() {
  const quickActionRail = treasury_home_view_model.quick_action_rail;
  const operationalPendingBlock = treasury_home_view_model.operational_pending_block;
  const quickActions = quickActionRail?.actions ?? [];
  const [pendingItems, setPendingItems] = useState<FinancialPendingItemRecord[]>([]);
  const [closingSummary, setClosingSummary] = useState<ClosingSummaryUiState>(
    buildInitialClosingSummaryState,
  );
  const [closingDetails, setClosingDetails] = useState<ClosingDetailsUiState>(
    buildInitialClosingDetailsState,
  );
  const [pendingState, setPendingState] = useState<
    | "loading_pending_items"
    | "empty_pending_items"
    | "pending_items_loaded"
    | "denied_or_session_invalid"
    | "server_error"
  >("loading_pending_items");
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingSelectionState, setPendingSelectionState] = useState(
    initialFinancialPendingSelectionState,
  );

  const loadPendingItems = useCallback(async (
    signal?: AbortSignal,
    options?: { preserveLoadingState?: boolean },
  ): Promise<void> => {
    if (!options?.preserveLoadingState) {
      setPendingState("loading_pending_items");
      setPendingError(null);
    }

    try {
      const response = await fetch("/api/finance/pending-items", {
        method: "GET",
        cache: "no-store",
        signal,
      });

      const body = (await response.json()) as
        | FinancialPendingItemsResponse
        | FinancialPendingItemsErrorResponse;

      if (!response.ok) {
        const message =
          "message" in body && typeof body.message === "string"
            ? body.message
            : "Server error";

        setPendingItems([]);
        setPendingError(message);
        setPendingState(
          response.status === 401 || response.status === 403
            ? "denied_or_session_invalid"
            : "server_error",
        );
        return;
      }

      const nextItems = (body as FinancialPendingItemsResponse).data.financial_pending_items;

      setPendingItems(nextItems);
      setPendingState(
        nextItems.length === 0 ? "empty_pending_items" : "pending_items_loaded",
      );
      setPendingSelectionState((current) => (
        current.selectedItemId !== null
          && !nextItems.some((item) => item.id === current.selectedItemId)
          ? clearPendingItemSelection(current)
          : current
      ));
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setPendingItems([]);
      setPendingError(
        error instanceof Error ? error.message : "Nao foi possivel carregar as pendencias agora.",
      );
      setPendingState("server_error");
    }
  }, []);

  const loadClosingSummary = useCallback(async (
    signal?: AbortSignal,
    options?: { preserveLoadingState?: boolean },
  ): Promise<FinancialClosingSummary | null> => {
    if (!options?.preserveLoadingState) {
      setClosingSummary(buildInitialClosingSummaryState());
    }

    try {
      const response = await fetch("/api/finance/closing-summary", {
        method: "GET",
        cache: "no-store",
        signal,
      });

      const body = (await response.json()) as
        | FinancialClosingSummaryResponse
        | FinancialClosingSummaryErrorResponse;

      if (!response.ok) {
        const message =
          "message" in body && typeof body.message === "string"
            ? body.message
            : "Server error";

        setClosingSummary((current) => ({
          state:
            response.status === 401 || response.status === 403
              ? "denied_or_session_invalid"
              : current.summary !== null
                ? "stale_home_state_recovered"
                : "server_error",
          summary: current.summary,
          message,
        }));
        return null;
      }

      const nextSummary = (body as FinancialClosingSummaryResponse).data.closing_summary;

      setClosingSummary({
        state: nextSummary.state,
        summary: nextSummary,
        message: null,
      });
      setClosingDetails((current) => (
        current.state === "details_collapsed"
          ? current
          : buildInitialClosingDetailsState()
      ));

      return nextSummary;
    } catch (error) {
      if (signal?.aborted) {
        return null;
      }

      setClosingSummary((current) => ({
        state: current.summary !== null ? "stale_home_state_recovered" : "server_error",
        summary: current.summary,
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o fechamento agora.",
      }));

      return null;
    }
  }, []);

  const loadClosingDetails = useCallback(async (
    signal?: AbortSignal,
    summaryOverride?: FinancialClosingSummary,
  ): Promise<void> => {
    const baseSummary = summaryOverride ?? closingSummary.summary;

    if (!baseSummary || baseSummary.state === "empty_closing_summary") {
      setClosingDetails(buildInitialClosingDetailsState());
      return;
    }

    const params = new URLSearchParams({
      include_details: "true",
      period_start: baseSummary.period_start,
      period_end: baseSummary.period_end,
    });

    setClosingDetails((current) => ({
      state: "loading_closing_details",
      summary: current.summary,
      message: null,
    }));

    try {
      const response = await fetch(`/api/finance/closing-summary?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });

      const body = (await response.json()) as
        | FinancialClosingSummaryResponse
        | FinancialClosingSummaryErrorResponse;

      if (!response.ok) {
        const message =
          "message" in body && typeof body.message === "string"
            ? body.message
            : "Server error";
        const errorSummary = "data" in body
          ? body.data?.closing_summary ?? null
          : null;
        const isConsistencyError = shouldPromoteDetailsErrorToClosingSummary(
          response.status,
          errorSummary,
        );

        if (isConsistencyError) {
          setClosingSummary(
            buildClosingSummaryStateFromDetailsConsistencyError(errorSummary, message),
          );
        }

        setClosingDetails({
          state:
            isConsistencyError
              ? "consistency_error"
              : response.status === 401 || response.status === 403
                ? "denied_or_session_invalid"
                : "server_error",
          summary: errorSummary,
          message,
        });
        return;
      }

      const nextSummary = (body as FinancialClosingSummaryResponse).data.closing_summary;
      if (nextSummary.state === "consistency_error") {
        setClosingSummary(
          buildClosingSummaryStateFromDetailsConsistencyError(
            nextSummary,
            "Nao foi possivel confirmar a consistencia do fechamento.",
          ),
        );
      }

      setClosingDetails({
        state: nextSummary.state === "consistency_error"
          ? "consistency_error"
          : "closing_details_loaded",
        summary: nextSummary,
        message: null,
      });
    } catch (error) {
      if (signal?.aborted) {
        return;
      }

      setClosingDetails({
        state: "server_error",
        summary: null,
        message:
          error instanceof Error
            ? error.message
            : "Nao foi possivel carregar o detalhamento agora.",
      });
    }
  }, [closingSummary.summary]);

  const refreshClosingAfterEntryMutation = useCallback(async (): Promise<void> => {
    const shouldReloadDetails = shouldReloadClosingDetailsAfterEntryMutation(
      closingDetails.state,
    );

    if (shouldReloadDetails) {
      setClosingDetails({
        state: "details_stale_after_mutation",
        summary: null,
        message: null,
      });
    }

    const nextSummary = await loadClosingSummary(undefined, { preserveLoadingState: true });

    if (shouldReloadDetails && nextSummary) {
      await loadClosingDetails(undefined, nextSummary);
    }
  }, [closingDetails.state, loadClosingDetails, loadClosingSummary]);

  useEffect(() => {
    const controller = new AbortController();

    queueMicrotask(() => {
      void loadPendingItems(controller.signal, { preserveLoadingState: true });
      void loadClosingSummary(controller.signal, { preserveLoadingState: true });
    });

    return () => {
      controller.abort();
    };
  }, [loadClosingSummary, loadPendingItems]);

  const pendingPresentation = buildPendingItemsPresentation(pendingItems);
  const selectedPendingItem = pendingItems.find(
    (item) => item.id === pendingSelectionState.selectedItemId,
  ) ?? null;
  const closingPendingItemsCount =
    pendingState === "pending_items_loaded" || pendingState === "empty_pending_items"
      ? pendingPresentation.pending_items_count
      : null;
  const closingPresentation = closingSummary.summary
    ? buildClosingSummaryPresentation(
      closingSummary.summary,
      closingPendingItemsCount,
    )
    : null;

  function handleSelectPendingItem(itemId: string) {
    setPendingSelectionState((current) => activatePendingItemSelection(current, itemId));
    document.getElementById("lancamento-rapido")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-6 py-10 sm:px-10 lg:px-12">
      <section className="grid gap-6 lg:grid-cols-[1.45fr_0.95fr]">
        <WeeklyPriorityBlock
          title={treasury_home_view_model.weekly_priority_block?.title ?? "Organize a rotina e prepare o fechamento da semana."}
          summary={treasury_home_view_model.weekly_priority_block?.summary ?? "Acompanhe as acoes prioritarias para manter a saude financeira e a transparencia da igreja."}
          priority_level={
            treasury_home_view_model.weekly_priority_block?.priority_level ?? "media"
          }
          primary_action_label={
            treasury_home_view_model.weekly_priority_block?.primary_action_label ?? "Revisar movimentos"
          }
          primary_action_href={
            treasury_home_view_model.weekly_priority_block?.primary_action_href ?? "/treasury#pendencias"
          }
          secondary_action_label={
            treasury_home_view_model.weekly_priority_block?.secondary_action_label ?? "Ver fechamento"
          }
          secondary_action_href={
            treasury_home_view_model.weekly_priority_block?.secondary_action_href ?? "/treasury#fechamento"
          }
        />

        <div id="lancamento-rapido" className="space-y-6">
          <QuickActionRail
            actions={quickActions}
            empty_state={quickActionRail?.empty_state ?? {
              summary: "Ainda nao ha acoes rapidas configuradas para este periodo.",
              cta_label: "Abrir lancamento",
              href: "/treasury#lancamento-rapido"
            }}
          />
          <TreasuryEntryForm
            pendingSelection={resolvePendingItemSelection(
              selectedPendingItem,
              pendingSelectionState.activationKey,
            )}
            onEntryMutation={refreshClosingAfterEntryMutation}
            onPendingResolution={() => {
              setPendingSelectionState(clearPendingItemSelection);
              return loadPendingItems();
            }}
            onPendingSelectionCleared={() => {
              setPendingSelectionState(clearPendingItemSelection);
            }}
          />
        </div>
      </section>

      <section className="mt-6 grid gap-6 xl:grid-cols-3">
        <div id="pendencias">
          <OperationalPendingBlock
            state={pendingState}
            items={pendingPresentation.items}
            error_message={pendingError ?? undefined}
            empty_state={operationalPendingBlock?.empty_state ?? {
              summary: "Nao ha pendencias de revisao no momento. O fluxo operacional segue em dia.",
              cta_label: "Conferir registros",
              href: "/treasury#fluxo-financeiro"
            }}
            onRetry={() => void loadPendingItems()}
            onSelectItem={handleSelectPendingItem}
          />
        </div>

        <div id="fechamento">
          <ClosingStatusBlock
            state={closingSummary.state}
            closing_summary={closingPresentation?.closing_summary ?? null}
            status_label={closingPresentation?.status_label ?? "carregando"}
            summary={closingPresentation?.summary ?? "Carregando o fechamento real do periodo atual."}
            pending_items_count={closingPendingItemsCount ?? 0}
            cta_label={closingPresentation?.cta_label ?? "Ver fechamento"}
            href={closingPresentation?.href ?? "/treasury#fechamento"}
            error_message={closingSummary.message ?? undefined}
            onRetry={() => void loadClosingSummary()}
            onRequestDetails={
              closingPresentation?.operational_status === "status_pronto_para_revisar"
              || closingPresentation?.operational_status === "consistency_error"
                ? () => void loadClosingDetails()
                : undefined
            }
            details_state={closingDetails.state}
            details_summary={closingDetails.summary}
            details_error_message={closingDetails.message ?? undefined}
            onRetryDetails={() => void loadClosingDetails()}
          />
        </div>

        <div id="fluxo-financeiro">
          <PayablesReceivablesBlock
            cta_label={treasury_home_view_model.payables_receivables_block?.cta_label ?? "Ver fluxo financeiro"}
            href={treasury_home_view_model.payables_receivables_block?.href ?? "/treasury#fluxo-financeiro"}
            empty_state={
              treasury_home_view_model.payables_receivables_block?.empty_state
            }
          />
        </div>
      </section>
    </main>
  );
}
