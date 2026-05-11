export type InitialFinancialCategory = {
  id: number;
  name: string;
  slug: string;
  kind: string;
};

export type InitialPersonCategory = {
  id: number;
  name: string;
  slug: string;
};

export type InitialCategoryDefaultsResponse = {
  data: {
    financial_categories: InitialFinancialCategory[];
    person_categories: InitialPersonCategory[];
  };
};
