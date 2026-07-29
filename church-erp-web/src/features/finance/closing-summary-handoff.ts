import { formatDecimalAmountForDisplay } from "@/features/finance/amount";
import type {
  ClosingDetailsLoadState,
  ClosingSummaryLoadState,
  ClosingSummaryOperationalStatus,
  FinancialClosingSummary,
} from "@/features/finance/closing-summary";

export type ClosingSummaryHandoffEligibility = {
  summary_state: ClosingSummaryLoadState;
  details_state: ClosingDetailsLoadState;
  operational_status: ClosingSummaryOperationalStatus;
  pending_items_count: number | null;
  summary: FinancialClosingSummary | null;
};

export type ClosingSummaryPrintSection = {
  heading: string;
  lines: string[];
};

export type ClosingSummaryHandoffContent = {
  title: string;
  plain_text: string;
  print_sections: ClosingSummaryPrintSection[];
  period_label: string;
  generated_at_label: string;
  source_summary: FinancialClosingSummary;
};

export type ClosingSummaryHandoffResult =
  | {
      state: "handoff_ready";
      content: ClosingSummaryHandoffContent;
    }
  | {
      state:
        | "handoff_needs_details"
        | "handoff_blocked_unreliable_summary"
        | "handoff_blocked_pending_items";
      message: string;
    };

export type NativeTextSharePayload = {
  title: string;
  text: string;
};

type NativeTextShareNavigator = {
  share?: (payload: NativeTextSharePayload) => Promise<void> | void;
  canShare?: (payload: NativeTextSharePayload) => boolean;
};

type ClipboardWriteEnvironment = {
  is_secure_context: boolean;
  clipboard?: {
    writeText?: (text: string) => Promise<void> | void;
  } | null;
};

type PrintDocumentLike = {
  querySelector: (selector: string) => unknown;
};

type BuildClosingSummaryHandoffContentInput = {
  eligibility: ClosingSummaryHandoffEligibility;
  generated_at?: Date | string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isDecimalContractValue(value: unknown, options?: { allowNegative?: boolean }): value is string {
  if (!isNonEmptyString(value)) {
    return false;
  }

  return options?.allowNegative
    ? /^-?\d+(?:\.\d{2})?$/.test(value)
    : /^\d+(?:\.\d{2})?$/.test(value);
}

function hasCompleteSummaryPayload(summary: FinancialClosingSummary): boolean {
  return isNonEmptyString(summary.period_start)
    && isNonEmptyString(summary.period_end)
    && isDecimalContractValue(summary.total_income)
    && isDecimalContractValue(summary.total_expense)
    && isDecimalContractValue(summary.net_result, { allowNegative: true })
    && Number.isInteger(summary.entry_count)
    && summary.entry_count >= 0
    && summary.calculation_basis === "financial_entries.created_at";
}

function formatUtcLabel(value: Date | string): string {
  if (typeof value === "string") {
    const match = value.match(
      /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/,
    );

    if (match) {
      const [, year, month, day, hour, minute] = match;

      return `${day}/${month}/${year} ${hour}:${minute} UTC`;
    }
  }

  const date = typeof value === "string" ? new Date(value) : value;
  const day = String(date.getUTCDate()).padStart(2, "0");
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hour}:${minute} UTC`;
}

export function buildClosingSummaryPeriodLabel(
  summary: FinancialClosingSummary,
): string {
  return `Periodo: ${formatUtcLabel(summary.period_start)} a ${formatUtcLabel(summary.period_end)}`;
}

function buildGeneratedAtLabel(generatedAt: Date | string): string {
  return `Preparado em ${formatUtcLabel(generatedAt)}`;
}

function normalizeHandoffLabel(label: string): string {
  const normalized = label
    .replace(/[\u0000-\u001F\u007F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return normalized === "" ? "Sem identificacao" : normalized;
}

function formatMovementLine(
  label: string,
  row: {
    total_income: string;
    total_expense: string;
    net_result: string;
    entry_count: number;
    percentage_of_total_movement?: string;
  },
): string {
  const safeLabel = normalizeHandoffLabel(label);

  return [
    `${safeLabel}: receitas ${formatDecimalAmountForDisplay(row.total_income)}`,
    `despesas ${formatDecimalAmountForDisplay(row.total_expense)}`,
    `resultado ${formatDecimalAmountForDisplay(row.net_result)}`,
    `${row.entry_count} lancamento${row.entry_count === 1 ? "" : "s"}`,
    row.percentage_of_total_movement
      ? `${row.percentage_of_total_movement}% do movimento`
      : null,
  ].filter((part): part is string => part !== null).join("; ");
}

function hasConsistentDetails(summary: FinancialClosingSummary): boolean {
  return Boolean(
    summary.details
      && summary.details.reconciliation.cost_center_status === "consistent"
      && summary.details.reconciliation.subtype_status === "consistent",
  );
}

function buildPrintSections(
  summary: FinancialClosingSummary,
  periodLabel: string,
  generatedAtLabel: string,
): ClosingSummaryPrintSection[] {
  const details = summary.details;
  const costCenterLines = details
    ? details.by_cost_center.map((row) => formatMovementLine(row.cost_center_name, row))
    : [];
  const subtypeLines = details
    ? details.by_subtype.map((row) => formatMovementLine(row.financial_category_name, row))
    : [];

  return [
    {
      heading: "Periodo",
      lines: [periodLabel],
    },
    {
      heading: "Totais consolidados",
      lines: [
        `Receitas: ${formatDecimalAmountForDisplay(summary.total_income)}`,
        `Despesas: ${formatDecimalAmountForDisplay(summary.total_expense)}`,
        `Resultado liquido: ${formatDecimalAmountForDisplay(summary.net_result)}`,
        `${summary.entry_count} lancamento${summary.entry_count === 1 ? "" : "s"} no periodo.`,
      ],
    },
    {
      heading: "Reconciliacao",
      lines: ["Reconciliacao: centros de custo e subtipos consistentes."],
    },
    {
      heading: "Por centro de custo",
      lines: costCenterLines.length > 0
        ? costCenterLines
        : ["Sem centro de custo com movimento neste periodo."],
    },
    {
      heading: "Por subtipo",
      lines: subtypeLines.length > 0
        ? subtypeLines
        : ["Sem subtipo com movimento neste periodo."],
    },
    {
      heading: "Base do fechamento",
      lines: [
        `Base de calculo: ${summary.calculation_basis}.`,
        generatedAtLabel,
      ],
    },
  ];
}

export function buildClosingSummaryHandoffContent({
  eligibility,
  generated_at = new Date(),
}: BuildClosingSummaryHandoffContentInput): ClosingSummaryHandoffResult {
  const summary = eligibility.summary;

  if (
    eligibility.summary_state !== "closing_summary_loaded"
    || !summary
    || summary.state !== "closing_summary_loaded"
    || !hasCompleteSummaryPayload(summary)
  ) {
    return {
      state: "handoff_blocked_unreliable_summary",
      message:
        "Nao foi possivel preparar o resumo para envio. Recarregue o fechamento e confira se ele esta pronto para revisar.",
    };
  }

  if (eligibility.pending_items_count === null || eligibility.pending_items_count > 0) {
    return {
      state: "handoff_blocked_pending_items",
      message:
        "Ainda ha pendencias operacionais a conferir antes de preparar o resumo para a lideranca.",
    };
  }

  if (eligibility.operational_status !== "status_pronto_para_revisar") {
    return {
      state: "handoff_blocked_unreliable_summary",
      message:
        "Nao foi possivel preparar o resumo para envio. Confira se o fechamento esta pronto para revisar.",
    };
  }

  if (eligibility.details_state !== "closing_details_loaded" || !summary.details) {
    return {
      state: "handoff_needs_details",
      message:
        "Carregue o detalhamento reconciliado do fechamento antes de preparar o resumo.",
    };
  }

  if (!hasConsistentDetails(summary)) {
    return {
      state: "handoff_blocked_unreliable_summary",
      message:
        "Nao foi possivel preparar o resumo porque a consistencia dos detalhes precisa ser confirmada.",
    };
  }

  const title = "Resumo de fechamento para a lideranca";
  const periodLabel = buildClosingSummaryPeriodLabel(summary);
  const generatedAtLabel = buildGeneratedAtLabel(generated_at);
  const printSections = buildPrintSections(summary, periodLabel, generatedAtLabel);
  const plainText = [
    title,
    "",
    periodLabel,
    "",
    "Totais consolidados",
    `Receitas: ${formatDecimalAmountForDisplay(summary.total_income)}`,
    `Despesas: ${formatDecimalAmountForDisplay(summary.total_expense)}`,
    `Resultado liquido: ${formatDecimalAmountForDisplay(summary.net_result)}`,
    `${summary.entry_count} lancamento${summary.entry_count === 1 ? "" : "s"} no periodo.`,
    "",
    "Reconciliacao: centros de custo e subtipos consistentes.",
    "",
    "Por centro de custo",
    ...printSections[3].lines,
    "",
    "Por subtipo",
    ...printSections[4].lines,
    "",
    `Base de calculo: ${summary.calculation_basis}.`,
    "Os valores acima usam o fechamento aprovado para a tesouraria neste periodo.",
    generatedAtLabel,
  ].join("\n");

  return {
    state: "handoff_ready",
    content: {
      title,
      plain_text: plainText,
      print_sections: printSections,
      period_label: periodLabel,
      generated_at_label: generatedAtLabel,
      source_summary: summary,
    },
  };
}

export function canUseNativeTextShare(
  navigatorLike: NativeTextShareNavigator,
  payload: NativeTextSharePayload,
): boolean {
  if (typeof navigatorLike.share !== "function") {
    return false;
  }

  if (typeof navigatorLike.canShare !== "function") {
    return true;
  }

  return navigatorLike.canShare(payload);
}

export function isUserCancelledShare(error: unknown): boolean {
  return Boolean(
    error
      && typeof error === "object"
      && "name" in error
      && error.name === "AbortError",
  );
}

export async function writeClosingSummaryTextToClipboard(
  environment: ClipboardWriteEnvironment,
  text: string,
): Promise<boolean> {
  if (
    !environment.is_secure_context
    || typeof environment.clipboard?.writeText !== "function"
  ) {
    return false;
  }

  try {
    await environment.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export async function shareClosingSummaryText(
  navigatorLike: NativeTextShareNavigator,
  payload: NativeTextSharePayload,
): Promise<"native_share_completed" | "native_share_cancelled" | "native_share_unavailable"> {
  if (!canUseNativeTextShare(navigatorLike, payload)) {
    return "native_share_unavailable";
  }

  try {
    await navigatorLike.share?.(payload);
    return "native_share_completed";
  } catch (error) {
    return isUserCancelledShare(error)
      ? "native_share_cancelled"
      : "native_share_unavailable";
  }
}

export function hasClosingSummaryPrintViewReady(documentLike: PrintDocumentLike): boolean {
  return Boolean(
    documentLike.querySelector("[data-closing-summary-print-view='ready']"),
  );
}
