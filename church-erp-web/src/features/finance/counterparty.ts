export type FinancialCounterpartyOption = {
  id: number;
  name: string;
  slug: string;
};

export type FinancialCounterpartiesResponse = {
  data: {
    financial_counterparties: FinancialCounterpartyOption[];
  };
};

export type CreateFinancialCounterpartyPayload = {
  name: string;
};

export type FinancialCounterpartyResponse = {
  data: FinancialCounterpartyOption & {
    message: string;
  };
};

export type FinancialCounterpartyErrorResponse = {
  message: string;
  errors?: Record<string, string[]>;
};
