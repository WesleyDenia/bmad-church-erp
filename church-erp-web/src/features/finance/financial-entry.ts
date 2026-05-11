export type FinancialEntryType = "income" | "expense";

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

export type FinancialEntryResponse = {
  data: {
    id: number;
    entry_type: FinancialEntryType;
    amount: string;
    financial_category_id: number;
    counterparty_id: number;
    counterparty_name: string;
    cost_center_name: string;
    created_at: string;
    message: string;
  };
};

export type FinancialEntryErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};
