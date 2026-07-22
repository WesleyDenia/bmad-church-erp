import { formatDecimalAmountForDisplay } from "@/features/finance/amount";

export type FinancialClosingSummaryState =
  | "closing_summary_loaded"
  | "empty_closing_summary"
  | "consistency_error";

export type FinancialClosingSummaryPeriodKind =
  | "current_operational_week"
  | "custom_period";

export type FinancialClosingSummary = {
  state: FinancialClosingSummaryState;
  period_kind: FinancialClosingSummaryPeriodKind;
  period_start: string;
  period_end: string;
  total_income: string;
  total_expense: string;
  net_result: string;
  entry_count: number;
  calculation_basis: "financial_entries.created_at";
  details?: ClosingSummaryDetails;
};

export type ClosingSummaryBreakdownRow = {
  total_income: string;
  total_expense: string;
  net_result: string;
  entry_count: number;
  percentage_of_total_movement?: string;
};

export type ClosingSummaryCostCenterBreakdownRow = ClosingSummaryBreakdownRow & {
  cost_center_key: string;
  cost_center_name: string;
};

export type ClosingSummarySubtypeBreakdownRow = ClosingSummaryBreakdownRow & {
  financial_category_id: number;
  financial_category_name: string;
  financial_category_slug: string;
  financial_category_kind: "income" | "expense" | string;
};

export type ClosingSummaryReconciliation = {
  cost_center_status: "consistent" | "inconsistent";
  subtype_status: "consistent" | "inconsistent";
};

export type ClosingSummaryDetails = {
  by_cost_center: ClosingSummaryCostCenterBreakdownRow[];
  by_subtype: ClosingSummarySubtypeBreakdownRow[];
  reconciliation: ClosingSummaryReconciliation;
};

export type FinancialClosingSummaryRequest = {
  period_start?: string;
  period_end?: string;
};

export type FinancialClosingSummaryResponse = {
  data: {
    closing_summary: FinancialClosingSummary;
  };
};

export type FinancialClosingSummaryErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
  data?: {
    closing_summary?: FinancialClosingSummary;
  };
};

export type ClosingSummaryLoadState =
  | "loading_closing_summary"
  | "closing_summary_loaded"
  | "empty_closing_summary"
  | "consistency_error"
  | "denied_or_session_invalid"
  | "server_error"
  | "stale_home_state_recovered";

export type ClosingDetailsLoadState =
  | "details_collapsed"
  | "loading_closing_details"
  | "closing_details_loaded"
  | "details_stale_after_mutation"
  | "consistency_error"
  | "denied_or_session_invalid"
  | "server_error";

export type ClosingSummaryUiState = {
  state: ClosingSummaryLoadState;
  summary: FinancialClosingSummary | null;
  message: string | null;
};

export type ClosingDetailsUiState = {
  state: ClosingDetailsLoadState;
  summary: FinancialClosingSummary | null;
  message: string | null;
};

export type ClosingSummaryOperationalStatus =
  | "status_em_andamento"
  | "status_pronto_para_revisar"
  | "status_atencao"
  | "status_concluido"
  | "empty_closing_summary"
  | "consistency_error"
  | "loading_closing_summary"
  | "denied_or_session_invalid"
  | "server_error"
  | "stale_home_state_recovered";

export type ClosingSummaryPresentation = {
  closing_summary: FinancialClosingSummary;
  operational_status: ClosingSummaryOperationalStatus;
  status_label: string;
  summary: string;
  cta_label: string;
  href: string;
};

export function buildInitialClosingSummaryState(): ClosingSummaryUiState {
  return {
    state: "loading_closing_summary",
    summary: null,
    message: null,
  };
}

export function buildInitialClosingDetailsState(): ClosingDetailsUiState {
  return {
    state: "details_collapsed",
    summary: null,
    message: null,
  };
}

export function shouldPromoteDetailsErrorToClosingSummary(
  status: number,
  closingSummary: FinancialClosingSummary | null,
): closingSummary is FinancialClosingSummary & { state: "consistency_error" } {
  return status === 409 && closingSummary?.state === "consistency_error";
}

export function buildClosingSummaryStateFromDetailsConsistencyError(
  closingSummary: FinancialClosingSummary,
  message: string,
): ClosingSummaryUiState {
  return {
    state: "consistency_error",
    summary: closingSummary,
    message,
  };
}

export function shouldReloadClosingDetailsAfterEntryMutation(
  state: ClosingDetailsLoadState,
): boolean {
  return state === "closing_details_loaded"
    || state === "consistency_error"
    || state === "details_stale_after_mutation";
}

export function buildClosingSummaryPresentation(
  closingSummary: FinancialClosingSummary,
  pendingItemsCount: number | null,
): ClosingSummaryPresentation {
  if (closingSummary.state === "consistency_error") {
    return {
      closing_summary: closingSummary,
      operational_status: "consistency_error",
      status_label: "consistencia pendente",
      summary:
        "Nao foi possivel confirmar a consistencia do fechamento. Tente carregar novamente antes de revisar os totais.",
      cta_label: "Tentar novamente",
      href: "/treasury#fechamento",
    };
  }

  if (closingSummary.state === "empty_closing_summary") {
    return {
      closing_summary: closingSummary,
      operational_status: "empty_closing_summary",
      status_label: "sem movimentos",
      summary:
        "Ainda nao ha movimentos neste periodo. Registre um lancamento para abrir o fechamento com dados reais.",
      cta_label: "Abrir lancamento rapido",
      href: "/treasury#lancamento-rapido",
    };
  }

  if (pendingItemsCount === null) {
    return {
      closing_summary: closingSummary,
      operational_status: "status_em_andamento",
      status_label: "em conferencia",
      summary: [
        `${closingSummary.entry_count} lancamentos reais no periodo.`,
        `Receitas: ${formatDecimalAmountForDisplay(closingSummary.total_income)}.`,
        `Despesas: ${formatDecimalAmountForDisplay(closingSummary.total_expense)}.`,
        "As pendencias operacionais ainda estao sendo conferidas antes da revisao final.",
      ].join(" "),
      cta_label: "Conferir pendencias",
      href: "/treasury#pendencias",
    };
  }

  const hasPendingItems = pendingItemsCount > 0;

  return {
    closing_summary: closingSummary,
    operational_status: hasPendingItems
      ? "status_em_andamento"
      : "status_pronto_para_revisar",
    status_label: hasPendingItems ? "em andamento" : "pronto para revisar",
    summary: [
      `${closingSummary.entry_count} lancamentos reais no periodo.`,
      `Receitas: ${formatDecimalAmountForDisplay(closingSummary.total_income)}.`,
      `Despesas: ${formatDecimalAmountForDisplay(closingSummary.total_expense)}.`,
      hasPendingItems
        ? "Revise as pendencias antes de seguir com a prestacao de contas."
        : "Sem pendencias abertas, o resumo ja pode ser revisado.",
    ].join(" "),
    cta_label: hasPendingItems ? "Revisar pendencias" : "Revisar fechamento",
    href: hasPendingItems ? "/treasury#pendencias" : "/treasury#fechamento",
  };
}
