import {
  normalizeLocalizedAmountInput,
} from "@/features/finance/amount";

export type FinancialEntryType = "income" | "expense";
export type FinancialEntryMode = "create" | "edit";

export type FinancialCategoryOption = {
  id: number;
  name: string;
  slug: string;
  kind: FinancialEntryType;
};

export type FinancialCategoriesResponse = {
  data: {
    financial_categories: FinancialCategoryOption[];
  };
};

export type FinancialEntryPayload = {
  entry_type: FinancialEntryType;
  amount: string;
  financial_category_id: number;
  counterparty_id: number;
  cost_center_name: string;
};

export type UpdateFinancialEntryPayload = FinancialEntryPayload & {
  reason: string;
};

export type FinancialEntryDraft = {
  entry_type: FinancialEntryType;
  amount_input: string;
  financial_category_id: string;
  counterparty_id: string;
  cost_center_name: string;
  reason: string;
};

export type FinancialEntryLatestAuditSnippet = {
  id: number;
  reason: string;
  user_name: string | null;
  created_at: string;
};

export type FinancialEntryRecord = {
  id: number;
  entry_type: FinancialEntryType;
  amount: string;
  financial_category_id: number;
  financial_category_name?: string | null;
  counterparty_id: number | null;
  counterparty_name: string;
  cost_center_name: string;
  created_at: string;
  updated_at?: string;
};

export type FinancialEntryResponse = {
  data: {
    id: number;
    entry_type: FinancialEntryType;
    amount: string;
    financial_category_id: number;
    financial_category_name?: string | null;
    counterparty_id: number | null;
    counterparty_name: string;
    cost_center_name: string;
    created_at: string;
    updated_at?: string;
    latest_audit?: FinancialEntryLatestAuditSnippet | null;
    message: string;
  };
};

export type FinancialEntryListItem = FinancialEntryRecord & {
  latest_audit: FinancialEntryLatestAuditSnippet | null;
};

export type FinancialEntriesResponse = {
  data: {
    financial_entries: FinancialEntryListItem[];
  };
};

export type FinancialEntryAuditChangedField = {
  field: string;
  old_value: unknown;
  new_value: unknown;
};

export type FinancialEntryAuditRecord = {
  id: number;
  reason: string;
  user_id: number;
  user_name: string | null;
  ip_address: string | null;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  changed_fields: FinancialEntryAuditChangedField[];
  created_at: string;
};

export type FinancialEntryAuditsResponse = {
  data: {
    audits: FinancialEntryAuditRecord[];
  };
};

export type FinancialEntryErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};

export type FinancialEntriesErrorResponse = FinancialEntryErrorResponse;
export type FinancialEntryAuditErrorResponse = FinancialEntryErrorResponse;

export function normalizeFinancialEntryUiMessage(message: string): string {
  return message === "Server error"
    ? "Nao foi possivel concluir a solicitacao agora."
    : message;
}

export function validateFinancialEntryDraft(
  draft: FinancialEntryDraft,
  options: { mode: FinancialEntryMode },
): Record<string, string[]> {
  const errors: Record<string, string[]> = {};

  if (!normalizeLocalizedAmountInput(draft.amount_input)) {
    errors.amount = ["Informe um valor valido, como 125,40."];
  }

  if (!draft.financial_category_id) {
    errors.financial_category_id = ["Escolha o subtipo deste lancamento."];
  }

  if (!draft.counterparty_id) {
    errors.counterparty_id = ["Escolha a contraparte deste lancamento."];
  }

  if (!draft.cost_center_name.trim()) {
    errors.cost_center_name = ["Informe o centro de custo deste lancamento."];
  }

  if (options.mode === "edit" && !draft.reason.trim()) {
    errors.reason = ["Informe o motivo da alteracao financeira."];
  }

  return errors;
}

export function buildFinancialEntryRequestPayload(
  draft: FinancialEntryDraft,
  options: { mode: FinancialEntryMode },
): FinancialEntryPayload | UpdateFinancialEntryPayload {
  const basePayload: FinancialEntryPayload = {
    entry_type: draft.entry_type,
    amount: normalizeLocalizedAmountInput(draft.amount_input) ?? "",
    financial_category_id: Number(draft.financial_category_id),
    counterparty_id: Number(draft.counterparty_id),
    cost_center_name: draft.cost_center_name.trim(),
  };

  if (options.mode === "edit") {
    return {
      ...basePayload,
      reason: draft.reason.trim(),
    };
  }

  return basePayload;
}

export function buildFinancialEntryListItemFromResponse(
  response: FinancialEntryResponse["data"],
): FinancialEntryListItem {
  return {
    id: response.id,
    entry_type: response.entry_type,
    amount: response.amount,
    financial_category_id: response.financial_category_id,
    financial_category_name: response.financial_category_name ?? null,
    counterparty_id: response.counterparty_id,
    counterparty_name: response.counterparty_name,
    cost_center_name: response.cost_center_name,
    created_at: response.created_at,
    updated_at: response.updated_at,
    latest_audit: response.latest_audit ?? null,
  };
}

export function upsertFinancialEntryListItem(
  entries: FinancialEntryListItem[],
  nextEntry: FinancialEntryListItem,
): FinancialEntryListItem[] {
  const currentIndex = entries.findIndex((entry) => entry.id === nextEntry.id);

  if (currentIndex === -1) {
    return [nextEntry, ...entries];
  }

  const nextEntries = [...entries];
  nextEntries[currentIndex] = nextEntry;

  return nextEntries;
}

export function getFinancialAuditFieldLabel(field: string): string {
  switch (field) {
    case "entry_type":
      return "Tipo";
    case "amount":
      return "Valor";
    case "financial_category_name":
      return "Subtipo";
    case "counterparty_name":
      return "Contraparte";
    case "cost_center_name":
      return "Centro de custo";
    default:
      return field;
  }
}
