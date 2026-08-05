import { formatDecimalAmountForDisplay } from "@/features/finance/amount";
import type { FinancialClosingSummary } from "@/features/finance/closing-summary";

export type LeadershipSummaryLoadState =
  | "loading_leadership_summary"
  | "leadership_summary_loaded"
  | "loading_leadership_details"
  | "leadership_details_loaded"
  | "empty_leadership_summary"
  | "leadership_consistency_error"
  | "leadership_denied_or_session_invalid"
  | "leadership_server_error"
  | "leadership_stale_state_recovered";

export type LeadershipConfidenceStatus =
  | "consolidado_carregado"
  | "detalhe_reconciliado"
  | "leitura_indisponivel";

export type OperationalSignalsState = "operational_signals_unavailable";

export type LeadershipSummaryUiState = {
  state: LeadershipSummaryLoadState;
  summary: FinancialClosingSummary | null;
  message: string | null;
};

export type LeadershipSummaryPresentation = {
  source_summary: FinancialClosingSummary;
  confidence_status: LeadershipConfidenceStatus;
  confidence_label: string;
  period_label: string;
  total_income_label: string;
  total_expense_label: string;
  net_result_label: string;
  entry_count_label: string;
  calculation_basis_label: string;
};

export function buildInitialLeadershipSummaryState(): LeadershipSummaryUiState {
  return {
    state: "loading_leadership_summary",
    summary: null,
    message: null,
  };
}

export function isLeadershipDetailsReconciled(summary: FinancialClosingSummary | null): boolean {
  return summary?.details?.reconciliation.cost_center_status === "consistent"
    && summary.details.reconciliation.subtype_status === "consistent";
}

export function getLeadershipConfidenceStatus(
  state: LeadershipSummaryLoadState,
  summary: FinancialClosingSummary | null,
): LeadershipConfidenceStatus {
  if (
    (state === "leadership_details_loaded" || state === "loading_leadership_details")
    && summary?.state === "closing_summary_loaded"
    && isLeadershipDetailsReconciled(summary)
  ) {
    return "detalhe_reconciliado";
  }

  if (
    (state === "leadership_summary_loaded" || state === "loading_leadership_details")
    && summary?.state === "closing_summary_loaded"
  ) {
    return "consolidado_carregado";
  }

  return "leitura_indisponivel";
}

export function buildLeadershipSummaryPresentation(
  closingSummary: FinancialClosingSummary,
  state: LeadershipSummaryLoadState = "leadership_summary_loaded",
): LeadershipSummaryPresentation {
  const confidenceStatus = getLeadershipConfidenceStatus(state, closingSummary);

  return {
    source_summary: closingSummary,
    confidence_status: confidenceStatus,
    confidence_label: confidenceLabel(confidenceStatus),
    period_label: formatUtcPeriod(closingSummary.period_start, closingSummary.period_end),
    total_income_label: formatDecimalAmountForDisplay(closingSummary.total_income),
    total_expense_label: formatDecimalAmountForDisplay(closingSummary.total_expense),
    net_result_label: formatDecimalAmountForDisplay(closingSummary.net_result),
    entry_count_label: `${closingSummary.entry_count} lancamento${closingSummary.entry_count === 1 ? "" : "s"}`,
    calculation_basis_label: calculationBasisLabel(closingSummary.calculation_basis),
  };
}

function calculationBasisLabel(calculationBasis: string): string {
  if (calculationBasis === "financial_entries.created_at") {
    return "Lancamentos registrados no periodo";
  }

  return "Base de calculo informada pelo fechamento";
}

function confidenceLabel(status: LeadershipConfidenceStatus): string {
  if (status === "detalhe_reconciliado") {
    return "Detalhe reconciliado";
  }

  if (status === "consolidado_carregado") {
    return "Consolidado carregado";
  }

  return "Leitura indisponivel";
}

function formatUtcPeriod(periodStart: string, periodEnd: string): string {
  return `${formatUtcDateTime(periodStart)} a ${formatUtcDateTime(periodEnd)}`;
}

function formatUtcDateTime(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return [
    `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}/${date.getUTCFullYear()}`,
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`,
  ].join(" ");
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}
