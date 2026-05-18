import type { FinancialCounterpartyOption } from "@/features/finance/counterparty";
import type {
  FinancialCategoryOption,
  FinancialEntryPayload,
} from "@/features/finance/financial-entry";

export type TreasuryEntryFormData = {
  entry_type: FinancialEntryPayload["entry_type"];
  amount_input: string;
  financial_category_id: string;
  counterparty_id: string;
  cost_center_name: string;
};

export const initialTreasuryEntryFormData: TreasuryEntryFormData = {
  entry_type: "income",
  amount_input: "",
  financial_category_id: "",
  counterparty_id: "",
  cost_center_name: "",
};

export function getDefaultCategoryId(
  categories: FinancialCategoryOption[],
  entryType: FinancialEntryPayload["entry_type"],
): string {
  const category = categories.find((item) => item.kind === entryType);

  return category ? String(category.id) : "";
}

export function resetTreasuryEntryFormData(
  categories: FinancialCategoryOption[],
): TreasuryEntryFormData {
  return {
    ...initialTreasuryEntryFormData,
    financial_category_id: getDefaultCategoryId(
      categories,
      initialTreasuryEntryFormData.entry_type,
    ),
  };
}

export function preserveTreasuryEntryFormData(
  form: TreasuryEntryFormData,
): TreasuryEntryFormData {
  return { ...form };
}

export function selectCreatedCounterparty(
  form: TreasuryEntryFormData,
  counterparty: FinancialCounterpartyOption,
): TreasuryEntryFormData {
  return {
    ...form,
    counterparty_id: String(counterparty.id),
  };
}
