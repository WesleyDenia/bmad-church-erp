import assert from "node:assert/strict";
import test from "node:test";
import {
  getDefaultCategoryId,
  preserveTreasuryEntryFormData,
  resetTreasuryEntryFormData,
  selectCreatedCounterparty,
} from "../src/features/finance/treasury-entry-form-state.ts";

test("counterparty inline success only replaces the selected counterparty in the main form", () => {
  const form = {
    entry_type: "income",
    amount_input: "125,40",
    financial_category_id: "7",
    counterparty_id: "",
    cost_center_name: "Cultos de domingo",
  };

  const nextForm = selectCreatedCounterparty(form, {
    id: 11,
    name: "Maria Souza",
    slug: "maria-souza",
  });

  assert.deepEqual(nextForm, {
    ...form,
    counterparty_id: "11",
  });
});

test("counterparty inline failure preserves the main form values already typed by the user", () => {
  const form = {
    entry_type: "expense",
    amount_input: "89,90",
    financial_category_id: "4",
    counterparty_id: "9",
    cost_center_name: "Acao social",
  };

  assert.deepEqual(preserveTreasuryEntryFormData(form), form);
});

test("treasury entry form reset restores the default entry type and first matching category", () => {
  const categories = [
    { id: 7, name: "Dizimos", slug: "dizimos", kind: "income" },
    { id: 9, name: "Acao social", slug: "acao-social", kind: "expense" },
  ];

  assert.equal(getDefaultCategoryId(categories, "income"), "7");
  assert.deepEqual(resetTreasuryEntryFormData(categories), {
    entry_type: "income",
    amount_input: "",
    financial_category_id: "7",
    counterparty_id: "",
    cost_center_name: "",
  });
});
