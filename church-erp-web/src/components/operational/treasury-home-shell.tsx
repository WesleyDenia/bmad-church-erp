"use client";

import { useCallback, useEffect, useState } from "react";
import { ClosingStatusBlock } from "@/components/operational/closing-status-block";
import { OperationalPendingBlock } from "@/components/operational/operational-pending-block";
import { PayablesReceivablesBlock } from "@/components/operational/payables-receivables-block";
import { QuickActionRail } from "@/components/operational/quick-action-rail";
import { TreasuryEntryForm } from "@/components/operational/treasury-entry-form";
import { WeeklyPriorityBlock } from "@/components/operational/weekly-priority-block";
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
  const closingStatus = treasury_home_view_model.closing_status_block;
  const [pendingItems, setPendingItems] = useState<FinancialPendingItemRecord[]>([]);
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

  useEffect(() => {
    const controller = new AbortController();

    queueMicrotask(() => {
      void loadPendingItems(controller.signal, { preserveLoadingState: true });
    });

    return () => {
      controller.abort();
    };
  }, [loadPendingItems]);

  const pendingPresentation = buildPendingItemsPresentation(pendingItems);
  const selectedPendingItem = pendingItems.find(
    (item) => item.id === pendingSelectionState.selectedItemId,
  ) ?? null;
  const closingPendingItemsCount =
    pendingState === "pending_items_loaded" || pendingState === "empty_pending_items"
      ? pendingPresentation.pending_items_count
      : 0;

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
            status_label={closingStatus?.status_label ?? "indisponivel"}
            summary={closingStatus?.summary ?? "O resumo de fechamento estara disponivel assim que houver movimentos registrados."}
            pending_items_count={closingPendingItemsCount}
            cta_label={closingStatus?.cta_label ?? "Ver detalhes"}
            href={closingStatus?.href ?? "/treasury#fechamento"}
            empty_state={closingStatus?.empty_state}
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
